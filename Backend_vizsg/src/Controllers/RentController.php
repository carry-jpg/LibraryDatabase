<?php
require_once __DIR__ . '/Controller.php';

// final class RentController extends Controller {
//   public function __construct(private RentRepository $rents) {}

//   // POST /api/rents/checkout
//   // Body: { "clientId": 1, "stockId": 10, "dateUntil": "2026-01-20 12:00:00", "rentQty": 1 }
//   public function checkout(): void {
//     try {
//       $b = $this->body();
//       $clientId  = $this->requireInt($b, 'clientId');
//       $stockId   = $this->requireInt($b, 'stockId');
//       $dateUntil = $this->requireString($b, 'dateUntil');
//       $rentQty   = isset($b['rentQty']) ? (int)$b['rentQty'] : 1;

//       $rentId = $this->rents->checkout($clientId, $stockId, $dateUntil, $rentQty);
//       $this->json([ 'ok' => true, 'rentId' => $rentId ], 201);

//     } catch (InvalidArgumentException $e) {
//       $this->json([ 'error' => $e->getMessage() ], 400);
//     } catch (Throwable $e) {
//       $this->json([ 'error' => $e->getMessage() ], 409); // conflict/not available/etc.
//     }
//   }

//   // POST /api/rents/return
//   // Body: { "rentId": 123 }
//   public function return(): void {
//     try {
//       $b = $this->body();
//       $rentId = $this->requireInt($b, 'rentId');

//       $this->rents->markReturned($rentId);
//       $this->json([ 'ok' => true ]);

//     } catch (InvalidArgumentException $e) {
//       $this->json([ 'error' => $e->getMessage() ], 400);
//     } catch (Throwable $e) {
//       $this->json([ 'error' => $e->getMessage() ], 404);
//     }
//   }

//   // GET /api/rents/active?clientId=1
//   public function active(): void {
//     try {
//       $clientId = isset($_GET['clientId']) ? (int)$_GET['clientId'] : 0;
//       if ($clientId < 1) throw new InvalidArgumentException("Missing/invalid: clientId");

//       $rows = $this->rents->listActiveByClient($clientId);
//       $this->json($rows);

//     } catch (Throwable $e) {
//       $this->json([ 'error' => $e->getMessage() ], 400);
//     }
//   }
// }
declare(strict_types=1);

final class RentController extends Controller {
  public function __construct(private RentRepository $rents) {}

  // POST /api/rents/checkout
  // Body: { "clientId": 1, "stockId": 10, "dateUntil": "2026-01-20 12:00:00", "rentQty": 1 }
  public function checkout(): void {
    try {
      $b = $this->body();
      $clientId  = $this->requireInt($b, 'clientId');
      $stockId   = $this->requireInt($b, 'stockId');
      $dateUntil = $this->requireString($b, 'dateUntil');
      $rentQty   = isset($b['rentQty']) ? (int)$b['rentQty'] : 1;

      $rentId = $this->rents->checkout($clientId, $stockId, $dateUntil, $rentQty);
      $this->json([ 'ok' => true, 'rentId' => $rentId ], 201);
    } catch (Throwable $e) {
      $this->json([ 'error' => $e->getMessage() ], 400);
    }
  }

  // POST /api/rents/return
  // Body: { "rentId": 123 }
  public function return(): void {
    try {
      $b = $this->body();
      $rentId = $this->requireInt($b, 'rentId');

      $this->rents->markReturned($rentId);
      $this->json([ 'ok' => true ]);
    } catch (Throwable $e) {
      $this->json([ 'error' => $e->getMessage() ], 400);
    }
  }

  // GET /api/rents/active?clientId=1
  public function active(): void {
    try {
      $clientId = isset($_GET['clientId']) ? (int)$_GET['clientId'] : 0;
      if ($clientId < 1) throw new InvalidArgumentException("Missing/invalid: clientId");

      $this->json($this->rents->listActiveByClient($clientId));
    } catch (Throwable $e) {
      $this->json([ 'error' => $e->getMessage() ], 400);
    }
  }
}
