<?php
declare(strict_types=1);

abstract class Controller
{
    protected function json($data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES);
    }

    protected function body(): array
    {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') return [];

        $data = json_decode($raw, true);
        if (!is_array($data)) throw new InvalidArgumentException("Invalid JSON body");
        return $data;
    }

    protected function requireString(array $b, string $key): string
    {
        if (!isset($b[$key]) || trim((string)$b[$key]) === '') {
            throw new InvalidArgumentException("Missing/invalid: {$key}");
        }
        return (string)$b[$key];
    }

    protected function requireInt(array $b, string $key): int
    {
        if (!isset($b[$key])) throw new InvalidArgumentException("Missing: {$key}");
        $v = (int)$b[$key];
        if ($v < 0) throw new InvalidArgumentException("Invalid: {$key}");
        return $v;
    }
}
