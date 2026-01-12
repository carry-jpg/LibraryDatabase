<?php
declare(strict_types=1);

final class StockController extends Controller {
  public function __construct(
    private StockRepository $stock,
    private BookRepository $books,
    private OpenLibraryClient $ol
  ) {}

  // POST /api/stock/set
  // Body: { "olid":"OLxxxxM", "quality":3, "quantity":5, "importIfMissing": true }
  public function set(): void {
    try {
      $b = $this->body();
      $olid = $this->requireString($b, 'olid');
      $quality = $this->requireInt($b, 'quality');
      $quantity = $this->requireInt($b, 'quantity');
      $importIfMissing = (bool)($b['importIfMissing'] ?? true);

      if ($importIfMissing && !$this->books->exists($olid)) {
        $edition = $this->ol->edition($olid);
        $mapped  = BookMapper::fromEditionJson($edition, $olid);
        $this->books->upsertFromOpenLibrary($mapped);
      }

      $this->stock->setStock($olid, $quality, $quantity);
      $this->json([ 'ok' => true ]);
    } catch (Throwable $e) {
      $this->json([ 'error' => $e->getMessage() ], 400);
    }
  }

  // GET /api/stock/list
  public function list(): void {
    try {
      $this->json($this->stock->listStockWithBook());
    } catch (Throwable $e) {
      $this->json([ 'error' => $e->getMessage() ], 500);
    }
  }
}
