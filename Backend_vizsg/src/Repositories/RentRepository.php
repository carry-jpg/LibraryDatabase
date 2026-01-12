<?php
// final class RentRepository {
//   public function __construct(private PDO $pdo) {}

//   public function checkout(int $clientId, int $stockId, string $dateUntil, int $rentQty = 1): int {
//     // dateUntil should be 'YYYY-MM-DD HH:MM:SS' (DATETIME)
//     $rentDate = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

//     $this->pdo->beginTransaction();
//     try {
//       // 1) Lock the stock row (serializes checkouts on same stockId)
//       $stmt = $this->pdo->prepare("SELECT quantity FROM stock WHERE stockid = ? FOR UPDATE");
//       $stmt->execute([$stockId]);
//       $row = $stmt->fetch();
//       if (!$row) {
//         throw new RuntimeException("Stock not found");
//       }
//       $quantity = (int)$row['quantity'];

//       // 2) Count active rented copies for this stock bucket
//       $stmt = $this->pdo->prepare("
//         SELECT COALESCE(SUM(rentqty), 0) AS active_qty
//         FROM rent
//         WHERE stockid = ? AND returned_at IS NULL
//       ");
//       $stmt->execute([$stockId]);
//       $activeQty = (int)$stmt->fetch()['active_qty'];

//       $available = $quantity - $activeQty;
//       if ($rentQty < 1) throw new RuntimeException("rentQty must be >= 1");
//       if ($available < $rentQty) {
//         throw new RuntimeException("Not enough copies available");
//       }

//       // 3) Create rent row
//       $stmt = $this->pdo->prepare("
//         INSERT INTO rent (rentdate, dateuntil, returned_at, rentqty, stockid, clientid)
//         VALUES (?, ?, NULL, ?, ?, ?)
//       ");
//       $stmt->execute([$rentDate, $dateUntil, $rentQty, $stockId, $clientId]);

//       $rentId = (int)$this->pdo->lastInsertId();
//       $this->pdo->commit();
//       return $rentId;

//     } catch (Throwable $e) {
//       $this->pdo->rollBack();
//       throw $e;
//     }
//   }

//   public function markReturned(int $rentId): void {
//     $returnedAt = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

//     $stmt = $this->pdo->prepare("
//       UPDATE rent
//       SET returned_at = ?
//       WHERE rentid = ? AND returned_at IS NULL
//     ");
//     $stmt->execute([$returnedAt, $rentId]);

//     if ($stmt->rowCount() < 1) {
//       throw new RuntimeException("Rent not found or already returned");
//     }
//   }

//   public function listActiveByClient(int $clientId): array {
//     $stmt = $this->pdo->prepare("
//       SELECT r.rentid, r.rentdate, r.dateuntil, r.rentqty, r.stockid,
//              s.openlibraryid, s.quality
//       FROM rent r
//       JOIN stock s ON s.stockid = r.stockid
//       WHERE r.clientid = ? AND r.returned_at IS NULL
//       ORDER BY r.rentdate DESC
//     ");
//     $stmt->execute([$clientId]);
//     return $stmt->fetchAll();
//   }
// }
declare(strict_types=1);

final class RentRepository {
  public function __construct(private PDO $pdo) {}

  public function checkout(int $clientId, int $stockId, string $dateUntil, int $rentQty = 1): int {
    $rentDate = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

    $this->pdo->beginTransaction();
    try {
      // Lock stock row
      $stmt = $this->pdo->prepare("SELECT quantity FROM stock WHERE stockid = ? FOR UPDATE");
      $stmt->execute([$stockId]);
      $row = $stmt->fetch();
      if (!$row) throw new RuntimeException("Stock not found");

      $quantity = (int)$row['quantity'];

      // Count active rentals
      $stmt = $this->pdo->prepare("
        SELECT COALESCE(SUM(rentqty), 0) AS active_qty
        FROM rent
        WHERE stockid = ? AND returned_at IS NULL
      ");
      $stmt->execute([$stockId]);
      $activeQty = (int)$stmt->fetch()['active_qty'];

      $available = $quantity - $activeQty;
      if ($rentQty < 1) throw new RuntimeException("rentQty must be >= 1");
      if ($available < $rentQty) throw new RuntimeException("Not enough copies available");

      $stmt = $this->pdo->prepare("
        INSERT INTO rent (rentdate, dateuntil, returned_at, rentqty, stockid, clientid)
        VALUES (?, ?, NULL, ?, ?, ?)
      ");
      $stmt->execute([$rentDate, $dateUntil, $rentQty, $stockId, $clientId]);

      $rentId = (int)$this->pdo->lastInsertId();
      $this->pdo->commit();
      return $rentId;

    } catch (Throwable $e) {
      $this->pdo->rollBack();
      throw $e;
    }
  }

  public function markReturned(int $rentId): void {
    $returnedAt = (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');

    $stmt = $this->pdo->prepare("
      UPDATE rent
      SET returned_at = ?
      WHERE rentid = ? AND returned_at IS NULL
    ");
    $stmt->execute([$returnedAt, $rentId]);

    if ($stmt->rowCount() < 1) {
      throw new RuntimeException("Rent not found or already returned");
    }
  }

  public function listActiveByClient(int $clientId): array {
    $stmt = $this->pdo->prepare("
      SELECT r.rentid, r.rentdate, r.dateuntil, r.rentqty,
             s.stockid, s.openlibraryid, s.quality,
             b.title, b.author
      FROM rent r
      JOIN stock s ON s.stockid = r.stockid
      JOIN book  b ON b.openlibraryid = s.openlibraryid
      WHERE r.clientid = ? AND r.returned_at IS NULL
      ORDER BY r.rentdate DESC
    ");
    $stmt->execute([$clientId]);
    return $stmt->fetchAll();
  }
}
