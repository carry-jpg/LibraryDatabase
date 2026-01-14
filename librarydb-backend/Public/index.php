<?php
declare(strict_types=1);

// ---------- Debug (DEV only) ----------
error_reporting(E_ALL);
ini_set('display_errors', '1');

// ---------- Boot ----------
session_start();

// Paths
$SRC = __DIR__ . '/../src';

// Config file returns an array, so ASSIGN it
$config = require $SRC . '/Config/config.php';

// Core
require_once $SRC . '/Database.php';
require_once $SRC . '/Controller.php';

// Existing app classes
require_once $SRC . '/OpenLibraryClient.php';
require_once $SRC . '/BookMapper.php';
require_once $SRC . '/BookRepository.php';
require_once $SRC . '/StockRepository.php';
require_once $SRC . '/BookController.php';
require_once $SRC . '/StockController.php';

// Auth classes
require_once $SRC . '/UserRepository.php';
require_once $SRC . '/AuthController.php';

// ---------- CORS (safe defaults) ----------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- Routing ----------
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

/**
 * Instantiate a repository/controller dependency by looking at the constructor's
 * first parameter type and injecting either $db or $pdo.
 */
function makeRepo(string $class, Database $db, PDO $pdo)
{
    $rc = new ReflectionClass($class);
    $ctor = $rc->getConstructor();

    // No constructor -> just create it
    if ($ctor === null)
        return new $class();

    $params = $ctor->getParameters();
    if (count($params) === 0)
        return new $class();

    $p0 = $params[0];
    $type = $p0->getType();

    // If no type-hint, default to PDO (most common in small apps)
    if (!$type instanceof ReflectionNamedType) {
        return new $class($pdo);
    }

    $typeName = $type->getName();

    // Inject based on declared type-hint
    if ($typeName === Database::class || $typeName === 'Database')
        return new $class($db);
    if ($typeName === PDO::class || $typeName === 'PDO')
        return new $class($pdo);

    // Unknown type-hint -> try PDO first, then Database
    try {
        return new $class($pdo);
    } catch (Throwable) {
        return new $class($db);
    }
}

try {
    $db = new Database($config['db']);
    $pdo = $db->pdo();

    $ol = new OpenLibraryClient($config['openlibrary']['base'] ?? 'https://openlibrary.org');

    // Repos (auto-inject Database/PDO)
    $bookRepo = makeRepo(BookRepository::class, $db, $pdo);
    $stockRepo = makeRepo(StockRepository::class, $db, $pdo);
    $userRepo = makeRepo(UserRepository::class, $db, $pdo);

    // Others
    $bookMapper = new BookMapper();
    $bookController = new BookController($bookRepo, $ol);
    $stockController = new StockController($stockRepo, $bookRepo, $ol);

    $authController = new AuthController($userRepo);

    // ---------- Auth ----------
    if ($method === 'GET' && $path === '/api/auth/me') {
        $authController->me();
        exit;
    }
    if ($method === 'POST' && $path === '/api/auth/register') {
        $authController->register();
        exit;
    }
    if ($method === 'POST' && $path === '/api/auth/login') {
        $authController->login();
        exit;
    }
    if ($method === 'POST' && $path === '/api/auth/logout') {
        $authController->logout();
        exit;
    }

    // ---------- OpenLibrary ----------
    if ($method === 'GET' && $path === '/api/openlibrary/search') {
        $bookController->openLibrarySearch();
        exit;
    }
    if ($method === 'GET' && $path === '/api/openlibrary/edition') {
        $bookController->openLibraryEdition();
        exit;
    }
    if ($method === 'POST' && $path === '/api/openlibrary/resolve-editions') {
        $bookController->resolveEditions();
        exit;
    }

    // Books import
    if ($method === 'POST' && $path === '/api/books/import-edition') {
        $bookController->importEdition();
        exit;
    }

    // ---------- Stock ----------
    if ($method === 'GET' && $path === '/api/stock/list') {
        $stockController->list();
        exit;
    }
    if ($method === 'POST' && $path === '/api/stock/set') {
        $stockController->set();
        exit;
    }
    if ($method === 'POST' && $path === '/api/stock/delete') {
        $stockController->delete();
        exit;
    }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code(404);
    echo json_encode(['error' => 'Not found', 'path' => $path], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'type' => get_class($e),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ], JSON_UNESCAPED_SLASHES);
}
