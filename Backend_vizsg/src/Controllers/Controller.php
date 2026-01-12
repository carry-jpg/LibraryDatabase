<?php
// abstract class Controller {
//   protected function json($data, int $status = 200): void {
//     http_response_code($status);
//     header('Content-Type: application/json; charset=utf-8');
//     echo json_encode($data, JSON_UNESCAPED_UNICODE);
//   }

//   protected function body(): array {
//     $raw = file_get_contents('php://input');
//     $data = json_decode($raw ?: '[]', true);
//     return is_array($data) ? $data : [];
//   }

//   protected function requireInt(array $data, string $key): int {
//     if (!isset($data[$key]) || !is_numeric($data[$key])) {
//       throw new InvalidArgumentException("Missing/invalid: $key");
//     }
//     return (int)$data[$key];
//   }

//   protected function requireString(array $data, string $key): string {
//     $v = $data[$key] ?? null;
//     if (!is_string($v) || trim($v) === '') {
//       throw new InvalidArgumentException("Missing/invalid: $key");
//     }
//     return trim($v);
//   }
// }
declare(strict_types=1);

abstract class Controller {
  protected function json($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
  }

  protected function body(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
  }

  protected function requireInt(array $data, string $key): int {
    if (!isset($data[$key]) || !is_numeric($data[$key])) {
      throw new InvalidArgumentException("Missing/invalid: $key");
    }
    return (int)$data[$key];
  }

  protected function requireString(array $data, string $key): string {
    $v = $data[$key] ?? null;
    if (!is_string($v) || trim($v) === '') {
      throw new InvalidArgumentException("Missing/invalid: $key");
    }
    return trim($v);
  }
}
