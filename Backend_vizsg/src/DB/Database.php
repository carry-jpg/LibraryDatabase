<?php
// final class Database {
//   private static ?PDO $pdo = null;

//   public static function pdo(array $config): PDO {
//     if (self::$pdo) return self::$pdo;

//     $pdo = new PDO(
//       $config['db']['dsn'],
//       $config['db']['user'],
//       $config['db']['pass'],
//       [
//         PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
//         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
//       ]
//     );
//     self::$pdo = $pdo;
//     return $pdo;
//   }
// }
declare(strict_types=1);

final class Database {
  private static ?PDO $pdo = null;

  public static function pdo(array $config): PDO {
    if (self::$pdo) return self::$pdo;

    $pdo = new PDO(
      $config['db']['dsn'],
      $config['db']['user'],
      $config['db']['pass'],
      [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
      ]
    );

    self::$pdo = $pdo;
    return $pdo;
  }
}

