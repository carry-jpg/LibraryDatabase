<?php
declare(strict_types=1);

$config = require __DIR__ . '/../src/Config/config.php';

require __DIR__ . '/../src/Db/Database.php';

require __DIR__ . '/../src/Services/OpenLibraryClient.php';

require __DIR__ . '/../src/Repositories/BookRepository.php';
require __DIR__ . '/../src/Repositories/StockRepository.php';
require __DIR__ . '/../src/Repositories/RentRepository.php';

require __DIR__ . '/../src/BookMapper.php';
require __DIR__ . '/../src/Controllers/Controller.php';
require __DIR__ . '/../src/Controllers/BookController.php';
require __DIR__ . '/../src/Controllers/StockController.php';
require __DIR__ . '/../src/Controllers/RentController.php';

$pdo = Database::pdo($config);

$openLibrary = new OpenLibraryClient($config['openlibrary']['base']);

$bookRepo  = new BookRepository($pdo);
$stockRepo = new StockRepository($pdo);
$rentRepo  = new RentRepository($pdo);

$bookCtrl  = new BookController($openLibrary, $bookRepo);
$stockCtrl = new StockController($stockRepo, $bookRepo, $openLibrary);
$rentCtrl  = new RentController($rentRepo);

$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

try {
  // Health
  if ($method === 'GET' && $path === '/api/health') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([ 'ok' => true ]);
    exit;
  }

  // OpenLibrary passthrough helpers
  if ($method === 'GET' && $path === '/api/openlibrary/search') { $bookCtrl->openLibrarySearch(); exit; }
  if ($method === 'GET' && $path === '/api/openlibrary/edition') { $bookCtrl->openLibraryEdition(); exit; }

  // Local books
  if ($method === 'POST' && $path === '/api/books/import-edition') { $bookCtrl->importEdition(); exit; }

  // Stock
  if ($method === 'POST' && $path === '/api/stock/set') { $stockCtrl->set(); exit; }
  if ($method === 'GET'  && $path === '/api/stock/list') { $stockCtrl->list(); exit; }

  // Renting
  if ($method === 'POST' && $path === '/api/rents/checkout') { $rentCtrl->checkout(); exit; }
  if ($method === 'POST' && $path === '/api/rents/return')   { $rentCtrl->return(); exit; }
  if ($method === 'GET'  && $path === '/api/rents/active')   { $rentCtrl->active(); exit; }

  http_response_code(404);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([ 'error' => 'Not found' ]);
} catch (Throwable $e) {
  http_response_code(500);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode([ 'error' => $e->getMessage() ]);
}
