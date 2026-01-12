<?php
declare(strict_types=1);

$ROOT = dirname(__DIR__);
$SRC  = $ROOT . DIRECTORY_SEPARATOR . 'src';

$config = require $SRC . '/Config/config.php';

require_once $SRC . '/Database.php';
require_once $SRC . '/Controller.php';

require_once $SRC . '/OpenLibraryClient.php';
require_once $SRC . '/BookMapper.php';

require_once $SRC . '/BookRepository.php';
require_once $SRC . '/StockRepository.php';

require_once $SRC . '/BookController.php';
require_once $SRC . '/StockController.php';

// CORS (Vite dev)
header('Access-Control-Allow-Origin: http://localhost:5173');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');
header('Access-Control-Max-Age: 86400');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$db = new Database($config['db']['dsn'], $config['db']['user'], $config['db']['pass']);
$ol = new OpenLibraryClient($config['openlibrary']['base']);

$booksRepo = new BookRepository($db);
$stockRepo = new StockRepository($db);

$bookController  = new BookController($booksRepo, $ol);
$stockController = new StockController($stockRepo, $booksRepo, $ol);

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    if ($method === 'GET' && $path === '/api/stock/list') { $stockController->list(); exit; }
    if ($method === 'POST' && $path === '/api/stock/set') { $stockController->set(); exit; }

    if ($method === 'GET' && $path === '/api/openlibrary/search') { $bookController->openLibrarySearch(); exit; }
    if ($method === 'GET' && $path === '/api/openlibrary/edition') { $bookController->openLibraryEdition(); exit; }
    if ($method === 'POST' && $path === '/api/books/import-edition') { $bookController->importEdition(); exit; }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code(404);
    echo json_encode(['error' => 'Not found', 'path' => $path], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_SLASHES);
}
