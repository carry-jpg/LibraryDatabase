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
            ON DUPLICATE KEY UPDATE
                quantity = VALUES(quantity)
        ";

        $st = $this->db->pdo()->prepare($sql);
        $st->execute([
            ':olid' => $olid,
            ':quality' => $quality,
            ':quantity' => $quantity,
        ]);
    }

    public function deleteById(int $stockId): void
    {
        $st = $this->db->pdo()->prepare("DELETE FROM stock WHERE stockid = :id");
        $st->execute([':id' => $stockId]);

        if ($st->rowCount() !== 1) {
            throw new RuntimeException("Stock not found");
        }
    }

    public function listStockWithBook(): array
    {
        // Library UI expects coverurl (your fakeData has it) so we provide it here too. [file:562]
        // OLID cover pattern is already used in EditStock.jsx, so it’s consistent. [file:557]
        $sql = "
            SELECT
                s.stockid,
                s.openlibraryid,
                s.quality,
                s.quantity,

                b.isbn,
                b.title,
                b.author,
                b.releaseyear,
                b.publisher,
                b.language,
                b.pages,

                CONCAT('https://covers.openlibrary.org/b/olid/', s.openlibraryid, '-M.jpg?default=false') AS coverurl
            FROM stock s
            JOIN book b ON b.openlibraryid = s.openlibraryid
            ORDER BY b.title ASC, s.quality ASC
        ";

        return $this->db->pdo()->query($sql)->fetchAll();
    }
}
