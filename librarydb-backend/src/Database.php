<?php
// File: Database.php
declare(strict_types=1);

final class Database
{
    private PDO $pdo;

    public function __construct(array $cfg)
    {
        $dsn = $cfg['dsn'] ?? '';
        $user = $cfg['user'] ?? '';
        $pass = $cfg['pass'] ?? '';

        $this->pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }
}
