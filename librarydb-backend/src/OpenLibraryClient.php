<?php
declare(strict_types=1);

final class OpenLibraryClient
{
    private string $baseUrl;

    public function __construct(string $baseUrl)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public function search(string $q, int $limit = 20): array
    {
        $url = $this->baseUrl . '/search.json?q=' . urlencode($q) . '&limit=' . $limit;
        return $this->getJson($url);
    }

    public function edition(string $olid): array
    {
        $url = $this->baseUrl . '/books/' . rawurlencode($olid) . '.json';
        return $this->getJson($url);
    }

    public function booksByIsbn(string $isbn): array
    {
        $isbn = strtoupper(preg_replace('/[^0-9X]/i', '', $isbn) ?? '');
        if ($isbn === '') throw new InvalidArgumentException("ISBN is empty/invalid");

        $url = $this->baseUrl . '/api/books?bibkeys=ISBN:' . rawurlencode($isbn) . '&format=json&jscmd=data';
        $data = $this->getJson($url);

        $key = 'ISBN:' . $isbn;
        return (isset($data[$key]) && is_array($data[$key])) ? $data[$key] : [];
    }

    private function getJson(string $url): array
    {
        $raw = @file_get_contents($url);
        if ($raw === false) throw new RuntimeException("OpenLibrary request failed");

        $data = json_decode($raw, true);
        if (!is_array($data)) throw new RuntimeException("OpenLibrary invalid JSON");

        return $data;
    }
}
