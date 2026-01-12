<?php
declare(strict_types=1);

final class StockRepository {
  public function __construct(private PDO $pdo) {}

  public function setStock(string $olid, int $quality, int $qty): void {
    $sql = "INSERT INTO stock (openlibraryid, quality, quantity)
            VALUES (:olid, :quality, :qty)
            ON DUPLICATE KEY UPDATE quantity = :qty2";
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([
      ':olid' => $olid,
      ':quality' => $quality,
      ':qty' => $qty,
      ':qty2' => $qty,
    ]);
  }

  public function listStockWithBook(): array {
    $stmt = $this->pdo->query("
      SELECT s.stockid, s.openlibraryid, s.quality, s.quantity,
             b.isbn, b.title, b.author, b.release_year, b.publisher, b.language, b.pages
      FROM stock s
      JOIN book b ON b.openlibraryid = s.openlibraryid
      ORDER BY b.title ASC, s.quality ASC
    ");
    return $stmt->fetchAll();
  }
}

