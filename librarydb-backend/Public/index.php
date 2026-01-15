<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

session_start();

/**
 * Resolve project paths.
 * Assumption: this file is in /Public and your PHP classes are in /src.
 */
$ROOT = realpath(__DIR__ . '/..');
$SRC  = realpath(__DIR__ . '/../src');

if ($ROOT === false) {
  http_response_code(500);
  header("Content-Type: application/json; charset=utf-8");
  echo json_encode(['error' => 'Cannot resolve project root']);
  exit;
}
if ($SRC === false) {
  http_response_code(500);
  header("Content-Type: application/json; charset=utf-8");
  echo json_encode(['error' => 'Cannot resolve src directory (expected ../src)']);
  exit;
}

/**
 * Config: use src/Config/config.php if present, else env fallback.
 * config.php should return an array like:
 * [
 *   'db' => ['dsn' => '...', 'user' => '...', 'pass' => '...'],
 *   'openlibrary' => ['base' => 'https://openlibrary.org']
 * ]
 */
$configPath = $SRC . '/Config/config.php';
if (is_file($configPath)) {
  $config = require $configPath;
  if (!is_array($config)) $config = [];
} else {
  $config = [];
}

$config = array_replace_recursive([
  'db' => [
    'dsn'  => getenv('DB_DSN')  ?: 'mysql:host=127.0.0.1;dbname=librarydb;charset=utf8mb4',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASS') ?: '',
  ],
  'openlibrary' => [
    'base' => getenv('OPENLIBRARY_BASE') ?: 'https://openlibrary.org',
  ],
], $config);

// ------------------------------------------------------------
// Includes
// ------------------------------------------------------------
require_once $SRC . '/Database.php';
require_once $SRC . '/Controller.php';

require_once $SRC . '/OpenLibraryClient.php';
require_once $SRC . '/BookMapper.php';

require_once $SRC . '/BookRepository.php';
require_once $SRC . '/StockRepository.php';
require_once $SRC . '/UserRepository.php';
require_once $SRC . '/WishlistRepository.php';

require_once $SRC . '/BookController.php';
require_once $SRC . '/StockController.php';
require_once $SRC . '/AuthController.php';

// ------------------------------------------------------------
// CORS (session cookies)
// ------------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
  header("Access-Control-Allow-Origin: {$origin}");
  header("Vary: Origin");
} else {
  header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function jsonOut($data, int $code = 200): void {
  header("Content-Type: application/json; charset=utf-8");
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_SLASHES);
}

function jsonBody(): array {
  $raw = file_get_contents("php://input");
  $data = json_decode($raw ?: "{}", true);
  return is_array($data) ? $data : [];
}

function dtNormalize(?string $s): ?string {
  $s = trim((string)($s ?? ''));
  if ($s === '') return null;
  $ts = strtotime($s);
  if ($ts === false) return null;
  return gmdate("Y-m-d H:i:s", $ts);
}

function ensureRentalsTable(PDO $pdo): void {
  // startat/endat are NULL until approved; returnedat/by are set on complete.
  $pdo->exec("
    CREATE TABLE IF NOT EXISTS rentals (
      rentalid   INT UNSIGNED NOT NULL AUTO_INCREMENT,
      userid     INT UNSIGNED NOT NULL,
      stockid    INT UNSIGNED NOT NULL,
      startat    DATETIME NULL,
      endat      DATETIME NULL,
      status     VARCHAR(16) NOT NULL DEFAULT 'pending',
      note       TEXT NULL,
      createdat  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decidedat  DATETIME NULL DEFAULT NULL,
      decidedby  INT UNSIGNED NULL DEFAULT NULL,
      returnedat DATETIME NULL DEFAULT NULL,
      returnedby INT UNSIGNED NULL DEFAULT NULL,

      PRIMARY KEY (rentalid),
      INDEX ix_rentals_user (userid),
      INDEX ix_rentals_stock (stockid),
      INDEX ix_rentals_status (status),
      INDEX ix_rentals_created (createdat)
    ) ENGINE=InnoDB
  ");

  // Best-effort upgrades if the table existed already
  try { $pdo->exec("ALTER TABLE rentals MODIFY startat DATETIME NULL"); } catch (Throwable) {}
  try { $pdo->exec("ALTER TABLE rentals MODIFY endat DATETIME NULL"); } catch (Throwable) {}
  try { $pdo->exec("ALTER TABLE rentals ADD COLUMN returnedat DATETIME NULL"); } catch (Throwable) {}
  try { $pdo->exec("ALTER TABLE rentals ADD COLUMN returnedby INT UNSIGNED NULL"); } catch (Throwable) {}
}

function markOverdue(PDO $pdo): void {
  // Approved rentals whose end date passed become not_returned
  $pdo->exec("
    UPDATE rentals
    SET status = 'not_returned'
    WHERE status = 'approved'
      AND endat IS NOT NULL
      AND endat < NOW()
  ");
}

// ------------------------------------------------------------
// Routing bootstrap
// ------------------------------------------------------------
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

/**
 * Simple repo factory: inject Database or PDO by first constructor param type.
 */
function makeRepo(string $class, Database $db, PDO $pdo) {
  $rc = new ReflectionClass($class);
  $ctor = $rc->getConstructor();
  if ($ctor === null) return new $class();

  $params = $ctor->getParameters();
  if (count($params) === 0) return new $class();

  $p0 = $params[0];
  $type = $p0->getType();

  if (!$type instanceof ReflectionNamedType) {
    return new $class($pdo);
  }

  $typeName = $type->getName();
  if ($typeName === Database::class || $typeName === 'Database') return new $class($db);
  if ($typeName === PDO::class || $typeName === 'PDO') return new $class($pdo);

  // Unknown -> try PDO, then Database
  try { return new $class($pdo); } catch (Throwable) { return new $class($db); }
}

try {
  $db = new Database($config['db']);
  $pdo = $db->pdo();

  $ol = new OpenLibraryClient($config['openlibrary']['base'] ?? 'https://openlibrary.org');

  // Repos
  $bookRepo = makeRepo(BookRepository::class, $db, $pdo);
  $stockRepo = makeRepo(StockRepository::class, $db, $pdo);
  $userRepo = makeRepo(UserRepository::class, $db, $pdo);
  $wishlistRepo = makeRepo(WishlistRepository::class, $db, $pdo);

  // Controllers
  $bookController = new BookController($bookRepo, $ol);
  $stockController = new StockController($stockRepo, $bookRepo, $ol);
  $authController = new AuthController($userRepo);

  // ---------------- Auth helpers (FIXED) ----------------
  $requireUser = function () use ($userRepo): array {
    $uid = $_SESSION['userid'] ?? null;
    if (!$uid) {
      jsonOut(['error' => 'Not authenticated'], 401);
      exit;
    }

    $u = $userRepo->findById((int)$uid);
    if (!$u) {
      jsonOut(['error' => 'Session user not found'], 401);
      exit;
    }
    return $u;
  };

  $requireAdmin = function () use ($requireUser): array {
    $u = $requireUser();
    if (($u['role'] ?? '') !== 'admin') {
      jsonOut(['error' => 'Forbidden'], 403);
      exit;
    }
    return $u;
  };

  // ------------------------------------------------------------
  // Auth
  // ------------------------------------------------------------
  if ($method === 'GET' && $path === '/api/auth/me') { $authController->me(); exit; }
  if ($method === 'POST' && $path === '/api/auth/register') { $authController->register(); exit; }
  if ($method === 'POST' && $path === '/api/auth/login') { $authController->login(); exit; }
  if ($method === 'POST' && $path === '/api/auth/logout') { $authController->logout(); exit; }

  // ------------------------------------------------------------
  // Admin: users
  // ------------------------------------------------------------
  if ($method === 'GET' && $path === '/api/admin/users') {
    $requireAdmin();
    jsonOut($userRepo->listPublic());
    exit;
  }

  if ($method === 'POST' && $path === '/api/admin/users/role') {
    $admin = $requireAdmin();
    $body = jsonBody();

    $userId = (int)($body['userId'] ?? $body['userid'] ?? 0);
    $role = strtolower(trim((string)($body['role'] ?? '')));

    if ($userId <= 0) {
      jsonOut(['error' => 'Missing userId'], 400);
      exit;
    }

    if (!in_array($role, ['user', 'admin'], true)) {
      jsonOut(['error' => 'Invalid role'], 400);
      exit;
    }

    if ($userId === (int)($admin['userid'] ?? 0) && $role !== 'admin') {
      jsonOut(['error' => 'Cannot remove your own admin role'], 409);
      exit;
    }

    if (!$userRepo->findById($userId)) {
      jsonOut(['error' => 'User not found'], 404);
      exit;
    }

    $ok = $userRepo->setRole($userId, $role);
    if (!$ok) {
      jsonOut(['error' => 'No change'], 409);
      exit;
    }

    jsonOut(['ok' => true]);
    exit;
  }

  // ------------------------------------------------------------
  // OpenLibrary + import
  // ------------------------------------------------------------
  if ($method === 'GET' && $path === '/api/openlibrary/search') { $bookController->openLibrarySearch(); exit; }
  if ($method === 'GET' && $path === '/api/openlibrary/edition') { $bookController->openLibraryEdition(); exit; }
  if ($method === 'POST' && $path === '/api/openlibrary/resolve-editions') { $bookController->resolveEditions(); exit; }

  if ($method === 'POST' && $path === '/api/books/import-edition') { $bookController->importEdition(); exit; }

  // ------------------------------------------------------------
  // Stock
  // ------------------------------------------------------------
  if ($method === 'GET' && $path === '/api/stock/list') { $stockController->list(); exit; }
  if ($method === 'POST' && $path === '/api/stock/set') { $stockController->set(); exit; }
  if ($method === 'POST' && $path === '/api/stock/delete') { $stockController->delete(); exit; }

  // ------------------------------------------------------------
  // Wishlist
  // ------------------------------------------------------------
  if ($method === "GET" && $path === "/api/wishlist/me") {
    $u = $requireUser();
    $rows = $wishlistRepo->listByUser((int)$u["userid"]);
    jsonOut($rows);
    exit;
  }

  if ($method === "GET" && $path === "/api/wishlist/ids") {
    $u = $requireUser();
    $ids = $wishlistRepo->idsByUser((int)$u["userid"]);
    jsonOut($ids);
    exit;
  }

  if ($method === "POST" && $path === "/api/wishlist/remove") {
    $u = $requireUser();
    $body = jsonBody();
    $olid = strtoupper(trim((string)($body["olid"] ?? "")));
    if ($olid === "") { jsonOut(["error" => "Missing olid"], 400); exit; }

    $wishlistRepo->remove((int)$u["userid"], $olid);
    jsonOut(["ok" => true]);
    exit;
  }

  if ($method === "POST" && $path === "/api/wishlist/toggle") {
    $u = $requireUser();
    $body = jsonBody();
    $olid = strtoupper(trim((string)($body["olid"] ?? "")));
    if ($olid === "") { jsonOut(["error" => "Missing olid"], 400); exit; }

    if ($wishlistRepo->exists((int)$u["userid"], $olid)) {
      $wishlistRepo->remove((int)$u["userid"], $olid);
      jsonOut(["wished" => false]);
      exit;
    }

    $wishlistRepo->add((int)$u["userid"], [
      "openlibraryid" => $olid,
      "title" => $body["title"] ?? null,
      "author" => $body["author"] ?? null,
      "coverurl" => $body["coverurl"] ?? null,
      "releaseyear" => $body["releaseyear"] ?? null,
    ]);

    jsonOut(["wished" => true]);
    exit;
  }

  if ($method === "GET" && $path === "/api/wishlist/admin/summary") {
    $requireAdmin();
    jsonOut($wishlistRepo->adminSummary());
    exit;
  }

  // ------------------------------------------------------------
  // Rentals (admin selects dates on approve, admin completes on return)
  // ------------------------------------------------------------

  // User: list my rentals
  if ($method === 'GET' && $path === '/api/rentals/my') {
    $u = $requireUser();
    ensureRentalsTable($pdo);
    markOverdue($pdo);

    $st = $pdo->prepare("
      SELECT
        r.rentalid,
        r.userid,
        r.stockid,
        r.startat,
        r.endat,
        r.status,
        r.note,
        r.createdat,
        r.decidedat,
        r.decidedby,
        r.returnedat,
        r.returnedby,

        s.openlibraryid,
        s.quality,
        b.title,
        b.author,
        b.releaseyear,
        CONCAT('https://covers.openlibrary.org/b/olid/', s.openlibraryid, '-M.jpg?default=false') AS coverurl
      FROM rentals r
      JOIN stock s ON s.stockid = r.stockid
      JOIN book b ON b.openlibraryid = s.openlibraryid
      WHERE r.userid = :uid
      ORDER BY r.createdat DESC
    ");
    $st->execute([':uid' => (int)$u['userid']]);
    jsonOut($st->fetchAll(PDO::FETCH_ASSOC) ?: []);
    exit;
  }

  // User: request a rental (no dates yet)
  if ($method === 'POST' && $path === '/api/rentals/request') {
    $u = $requireUser();
    ensureRentalsTable($pdo);

    $body = jsonBody();
    $stockId = (int)($body['stockId'] ?? $body['stockid'] ?? 0);
    if ($stockId <= 0) { jsonOut(['error' => 'Missing stockId'], 400); exit; }

    // ensure stock exists
    $chk = $pdo->prepare("SELECT 1 FROM stock WHERE stockid = :id LIMIT 1");
    $chk->execute([':id' => $stockId]);
    if (!(bool)$chk->fetchColumn()) { jsonOut(['error' => 'Stock not found'], 404); exit; }

    $note = isset($body['note']) ? trim((string)$body['note']) : null;
    if ($note === '') $note = null;

    $ins = $pdo->prepare("
      INSERT INTO rentals (userid, stockid, startat, endat, status, note)
      VALUES (:uid, :sid, NULL, NULL, 'pending', :note)
    ");
    $ins->execute([
      ':uid' => (int)$u['userid'],
      ':sid' => $stockId,
      ':note' => $note,
    ]);

    jsonOut(['ok' => true, 'rentalid' => (int)$pdo->lastInsertId()], 201);
    exit;
  }

  // Admin: pending requests
  if ($method === 'GET' && $path === '/api/rentals/admin/requests') {
    $requireAdmin();
    ensureRentalsTable($pdo);
    markOverdue($pdo);

    $st = $pdo->query("
      SELECT
        r.rentalid,
        r.userid,
        u.email,
        u.name,
        r.stockid,
        r.status,
        r.note,
        r.createdat,

        s.openlibraryid,
        s.quality,
        s.quantity,
        b.title,
        b.author,
        b.releaseyear,
        CONCAT('https://covers.openlibrary.org/b/olid/', s.openlibraryid, '-M.jpg?default=false') AS coverurl
      FROM rentals r
      JOIN users u ON u.userid = r.userid
      JOIN stock s ON s.stockid = r.stockid
      JOIN book b ON b.openlibraryid = s.openlibraryid
      WHERE r.status = 'pending'
      ORDER BY r.createdat ASC
    ");
    jsonOut($st->fetchAll(PDO::FETCH_ASSOC) ?: []);
    exit;
  }

  // Admin: approved list (only approved; overdue becomes not_returned and will not appear here)
  if ($method === 'GET' && $path === '/api/rentals/admin/approved') {
    $requireAdmin();
    ensureRentalsTable($pdo);
    markOverdue($pdo);

    $st = $pdo->query("
      SELECT
        r.rentalid,
        r.userid,
        u.email,
        u.name,
        r.stockid,
        r.startat,
        r.endat,
        r.status,
        r.note,
        r.createdat,
        r.decidedat,
        r.decidedby,

        s.openlibraryid,
        s.quality,
        b.title,
        b.author,
        b.releaseyear,
        CONCAT('https://covers.openlibrary.org/b/olid/', s.openlibraryid, '-M.jpg?default=false') AS coverurl
      FROM rentals r
      JOIN users u ON u.userid = r.userid
      JOIN stock s ON s.stockid = r.stockid
      JOIN book b ON b.openlibraryid = s.openlibraryid
      WHERE r.status = 'approved'
      ORDER BY r.decidedat DESC, r.createdat DESC
    ");
    jsonOut($st->fetchAll(PDO::FETCH_ASSOC) ?: []);
    exit;
  }

  // Admin: active rentals (approved + not_returned) so you can "complete" them
  if ($method === 'GET' && $path === '/api/rentals/admin/active') {
    $requireAdmin();
    ensureRentalsTable($pdo);
    markOverdue($pdo);

    $st = $pdo->query("
      SELECT
        r.rentalid,
        r.userid,
        u.email,
        u.name,
        r.stockid,
        r.startat,
        r.endat,
        r.status,
        r.note,
        r.createdat,
        r.decidedat,
        r.decidedby,

        s.openlibraryid,
        s.quality,
        b.title,
        b.author,
        b.releaseyear,
        CONCAT('https://covers.openlibrary.org/b/olid/', s.openlibraryid, '-M.jpg?default=false') AS coverurl
      FROM rentals r
      JOIN users u ON u.userid = r.userid
      JOIN stock s ON s.stockid = r.stockid
      JOIN book b ON b.openlibraryid = s.openlibraryid
      WHERE r.status IN ('approved','not_returned')
      ORDER BY r.endat ASC, r.createdat DESC
    ");
    jsonOut($st->fetchAll(PDO::FETCH_ASSOC) ?: []);
    exit;
  }

  // Admin: approve request (sets dates + decrements stock)
  if ($method === 'POST' && $path === '/api/rentals/admin/approve') {
    $admin = $requireAdmin();
    ensureRentalsTable($pdo);

    $body = jsonBody();
    $rentalId = (int)($body['requestId'] ?? $body['rentalId'] ?? $body['rentalid'] ?? 0);
    if ($rentalId <= 0) { jsonOut(['error' => 'Missing requestId'], 400); exit; }

    $startAt = dtNormalize($body['startAt'] ?? $body['startat'] ?? null);
    $endAt   = dtNormalize($body['endAt'] ?? $body['endat'] ?? null);
    if (!$startAt || !$endAt) { jsonOut(['error' => 'Missing startAt/endAt'], 400); exit; }
    if (strtotime($endAt . " UTC") <= strtotime($startAt . " UTC")) {
      jsonOut(['error' => 'endAt must be after startAt'], 400);
      exit;
    }

    $pdo->beginTransaction();
    try {
      // Lock rental row
      $st = $pdo->prepare("SELECT * FROM rentals WHERE rentalid = :id FOR UPDATE");
      $st->execute([':id' => $rentalId]);
      $r = $st->fetch(PDO::FETCH_ASSOC);

      if (!$r) { $pdo->rollBack(); jsonOut(['error' => 'Request not found'], 404); exit; }
      if (($r['status'] ?? '') !== 'pending') { $pdo->rollBack(); jsonOut(['error' => 'Request is not pending'], 409); exit; }

      $stockId = (int)$r['stockid'];

      // Lock stock row and check quantity
      $st2 = $pdo->prepare("SELECT quantity FROM stock WHERE stockid = :sid FOR UPDATE");
      $st2->execute([':sid' => $stockId]);
      $qty = $st2->fetchColumn();

      if ($qty === false) { $pdo->rollBack(); jsonOut(['error' => 'Stock not found'], 404); exit; }
      if ((int)$qty <= 0) { $pdo->rollBack(); jsonOut(['error' => 'Out of stock'], 409); exit; }

      // Decrement stock
      $pdo->prepare("UPDATE stock SET quantity = quantity - 1 WHERE stockid = :sid")
          ->execute([':sid' => $stockId]);

      // Approve
      $upd = $pdo->prepare("
        UPDATE rentals
        SET status = 'approved',
            startat = :startat,
            endat = :endat,
            decidedat = NOW(),
            decidedby = :adminid
        WHERE rentalid = :id AND status = 'pending'
      ");
      $upd->execute([
        ':startat' => $startAt,
        ':endat' => $endAt,
        ':adminid' => (int)$admin['userid'],
        ':id' => $rentalId,
      ]);

      if ($upd->rowCount() !== 1) { $pdo->rollBack(); jsonOut(['error' => 'Failed to approve'], 500); exit; }

      $pdo->commit();
      jsonOut(['ok' => true]);
      exit;
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  // Admin: dismiss request
  if ($method === 'POST' && $path === '/api/rentals/admin/dismiss') {
    $admin = $requireAdmin();
    ensureRentalsTable($pdo);

    $body = jsonBody();
    $rentalId = (int)($body['requestId'] ?? $body['rentalId'] ?? $body['rentalid'] ?? 0);
    if ($rentalId <= 0) { jsonOut(['error' => 'Missing requestId'], 400); exit; }

    $st = $pdo->prepare("
      UPDATE rentals
      SET status = 'dismissed', decidedat = NOW(), decidedby = :adminid
      WHERE rentalid = :id AND status = 'pending'
    ");
    $st->execute([':adminid' => (int)$admin['userid'], ':id' => $rentalId]);

    if ($st->rowCount() !== 1) {
      jsonOut(['error' => 'Request not found or not pending'], 404);
      exit;
    }

    jsonOut(['ok' => true]);
    exit;
  }

  // Admin: complete rental (confirm returned + increment stock)
  if ($method === 'POST' && $path === '/api/rentals/admin/complete') {
    $admin = $requireAdmin();
    ensureRentalsTable($pdo);
    markOverdue($pdo);

    $body = jsonBody();
    $rentalId = (int)($body['rentalId'] ?? $body['rentalid'] ?? 0);
    if ($rentalId <= 0) { jsonOut(['error' => 'Missing rentalId'], 400); exit; }

    $pdo->beginTransaction();
    try {
      $st = $pdo->prepare("SELECT * FROM rentals WHERE rentalid = :id FOR UPDATE");
      $st->execute([':id' => $rentalId]);
      $r = $st->fetch(PDO::FETCH_ASSOC);

      if (!$r) { $pdo->rollBack(); jsonOut(['error' => 'Rental not found'], 404); exit; }

      $status = (string)($r['status'] ?? '');
      if (!in_array($status, ['approved', 'not_returned'], true)) {
        $pdo->rollBack();
        jsonOut(['error' => 'Only approved/not_returned rentals can be completed'], 409);
        exit;
      }

      $stockId = (int)$r['stockid'];

      // Lock stock row
      $st2 = $pdo->prepare("SELECT quantity FROM stock WHERE stockid = :sid FOR UPDATE");
      $st2->execute([':sid' => $stockId]);
      $qty = $st2->fetchColumn();
      if ($qty === false) { $pdo->rollBack(); jsonOut(['error' => 'Stock not found'], 404); exit; }

      // Mark completed
      $upd = $pdo->prepare("
        UPDATE rentals
        SET status = 'completed',
            returnedat = NOW(),
            returnedby = :adminid
        WHERE rentalid = :id
      ");
      $upd->execute([':adminid' => (int)$admin['userid'], ':id' => $rentalId]);

      // Return copy to stock
      $pdo->prepare("UPDATE stock SET quantity = quantity + 1 WHERE stockid = :sid")
          ->execute([':sid' => $stockId]);

      $pdo->commit();
      jsonOut(['ok' => true]);
      exit;
    } catch (Throwable $e) {
      if ($pdo->inTransaction()) $pdo->rollBack();
      throw $e;
    }
  }

  // ------------------------------------------------------------
  // Not found
  // ------------------------------------------------------------
  jsonOut(['error' => 'Not found', 'path' => $path], 404);
  exit;

} catch (Throwable $e) {
  jsonOut([
    'error' => $e->getMessage(),
    'type' => get_class($e),
    'file' => $e->getFile(),
    'line' => $e->getLine(),
  ], 500);
  exit;
}
