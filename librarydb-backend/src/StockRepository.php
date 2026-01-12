<?php
declare(strict_types=1);

final class StockRepository
{
    public function __construct(private Database $db) {}

    public function setStock(string $olid, int $quality, int $quantity): void
    {
        $sql = "
INSERT INTO stock (openlibraryid, quality, quantity)
VALUES (:olid, :quality, :quantity)
ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
";
        $st = $this->db->pdo()->prepare($sql);
        $st->execute([
            ':olid' => $olid,
            ':quality' => $quality,
            ':quantity' => $quantity,
        ]);
    }

    public function listStockWithBook(): array
    {
        $sql = "
SELECT
  s.stockid, s.openlibraryid, s.quality, s.quantity,
  b.isbn, b.title, b.author, b.releaseyear, b.publisher, b.language, b.pages
FROM stock s
JOIN book b ON b.openlibraryid = s.openlibraryid
ORDER BY b.title ASC
";
        return $this->db->pdo()->query($sql)->fetchAll();
    }
}
