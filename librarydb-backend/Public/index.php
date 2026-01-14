<?php
declare(strict_types=1);

// File: index.php

// ---------- Boot ----------
session_start();

$config = require __DIR__ . '/config.php';

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/Controller.php';

// Existing app classes (adjust paths if your structure differs)
require_once __DIR__ . '/OpenLibraryClient.php';
require_once __DIR__ . '/BookMapper.php';
require_once __DIR__ . '/BookRepository.php';
require_once __DIR__ . '/StockRepository.php';
require_once __DIR__ . '/BookController.php';
require_once __DIR__ . '/StockController.php';

// New auth classes
require_once __DIR__ . '/UserRepository.php';
require_once __DIR__ . '/AuthController.php';

// ---------- CORS (safe defaults) ----------
// If you always access backend via Vite proxy (/api -> localhost:8000), this won't hurt. [file:591]
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- Routing ----------
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';

try {
    $db = new Database($config['db']);
    $pdo = $db->pdo();

    // Build dependencies (constructor args may need adjusting to your actual class signatures)
    $ol = new OpenLibraryClient($config['openlibrary']['base'] ?? 'https://openlibrary.org');

    $bookRepo = new BookRepository($pdo);
    $bookMapper = new BookMapper();
    $stockRepo = new StockRepository($pdo);

    $bookController = new BookController($bookRepo, $bookMapper, $ol);
    $stockController = new StockController($stockRepo, $bookRepo);

    $userRepo = new UserRepository($pdo);
    $authController = new AuthController($userRepo);

    // ---------- Auth ----------
    if ($method === 'GET' && $path === '/api/auth/me') { $authController->me(); exit; }
    if ($method === 'POST' && $path === '/api/auth/register') { $authController->register(); exit; }
    if ($method === 'POST' && $path === '/api/auth/login') { $authController->login(); exit; }
    if ($method === 'POST' && $path === '/api/auth/logout') { $authController->logout(); exit; }

    // ---------- OpenLibrary ----------
    if ($method === 'GET' && $path === '/api/openlibrary/search') { $bookController->openLibrarySearch(); exit; }
    if ($method === 'GET' && $path === '/api/openlibrary/edition') { $bookController->openLibraryEdition(); exit; }

    // Bulk resolve
    if ($method === 'POST' && $path === '/api/openlibrary/resolve-editions') { $bookController->resolveEditions(); exit; }

    // Books import
    if ($method === 'POST' && $path === '/api/books/import-edition') { $bookController->importEdition(); exit; }

    // ---------- Stock ----------
    if ($method === 'GET' && $path === '/api/stock/list') { $stockController->list(); exit; }
    if ($method === 'POST' && $path === '/api/stock/set') { $stockController->set(); exit; }
    if ($method === 'POST' && $path === '/api/stock/delete') { $stockController->delete(); exit; }

    header('Content-Type: application/json; charset=utf-8');
    http_response_code(404);
    echo json_encode(['error' => 'Not found', 'path' => $path], JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_SLASHES);
}
