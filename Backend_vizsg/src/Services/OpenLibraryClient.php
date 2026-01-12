<?php
// final class OpenLibraryClient {
//   public function __construct(private string $baseUrl) {}

//   public function search(string $q, int $limit = 20): array {
//     $url = $this->baseUrl . '/search.json?q=' . urlencode($q) . '&limit=' . $limit;
//     return $this->getJson($url);
//   }

//   public function edition(string $olid): array {
//     // Edition OLID usually looks like OLxxxxxM
//     $url = $this->baseUrl . '/books/' . rawurlencode($olid) . '.json';
//     return $this->getJson($url);
//   }

//   private function getJson(string $url): array {
//     $raw = file_get_contents($url);
//     if ($raw === false) throw new RuntimeException("OpenLibrary request failed");
//     $data = json_decode($raw, true);
//     if (!is_array($data)) throw new RuntimeException("OpenLibrary invalid JSON");
//     return $data;
//   }
declare(strict_types=1);

final class OpenLibraryClient {
  public function __construct(private string $baseUrl) {}

  public function search(string $q, int $limit = 20): array {
    $url = $this->baseUrl . '/search.json?q=' . urlencode($q) . '&limit=' . $limit;
    return $this->getJson($url);
  }

  public function edition(string $olid): array {
    // Edition page is also an API when you add .json
    $url = $this->baseUrl . '/books/' . rawurlencode($olid) . '.json';
    return $this->getJson($url);
  }

  private function getJson(string $url): array {
    $raw = @file_get_contents($url);
    if ($raw === false) {
      throw new RuntimeException("OpenLibrary request failed");
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
      throw new RuntimeException("OpenLibrary invalid JSON");
    }
    return $data;
  }
}

