<?php
declare(strict_types=1);

final class BookController extends Controller {
  public function __construct(
    private OpenLibraryClient $ol,
    private BookRepository $books
  ) {}

  // GET /api/openlibrary/search?q=harry+potter&limit=10
  public function openLibrarySearch(): void {
    try {
      $q = isset($_GET['q']) ? (string)$_GET['q'] : '';
      $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
      if (trim($q) === '') throw new InvalidArgumentException("Missing q");

      $this->json($this->ol->search($q, $limit));
    } catch (Throwable $e) {
      $this->json([ 'error' => $e->getMessage() ], 400);
    }
  }

  // GET /api/openlibrary/edition?olid=OL7353617M
  public function openLibraryEdition(): void {
    try {
      $olid = isset($_GET['olid']) ? (string)$_GET['olid'] : '';
      if (trim($olid) === '') throw new InvalidArgumentException("Missing olid");

      $this->json($this->ol->edition($olid));
    } catch (Throwable $e) {
      $this->json([ 'error' => $e->getMessage() ], 400);
    }
  }

  // POST /api/books/import-edition
  // Body: { "olid": "OLxxxxM" }
  public function importEdition(): void {
    try {
      $b = $this->body();
      $olid = $this->requireString($b, 'olid');

      $edition = $this->ol->edition($olid);

      $mapped = BookMapper::fromEditionJson($edition, $olid);
      $this->books->upsertFromOpenLibrary($mapped);

      $this->json([ 'ok' => true, 'book' => $mapped ], 201);
    } catch (Throwable $e) {
      $this->json([ 'error' => $e->getMessage() ], 400);
    }
  }
}
