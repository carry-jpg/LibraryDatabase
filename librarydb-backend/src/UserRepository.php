<?php
declare(strict_types=1);

final class UserRepository
{
    public function __construct(private PDO $pdo) {}

    public function countUsers(): int
    {
        return (int)$this->pdo->query("SELECT COUNT(*) AS c FROM users")->fetch()['c'];
    }

    public function findByEmail(string $email): ?array
    {
        $st = $this->pdo->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $st->execute(['email' => $email]);
        $row = $st->fetch();
        return $row ?: null;
    }

    public function findById(int $id): ?array
    {
        $st = $this->pdo->prepare("SELECT * FROM users WHERE userid = :id LIMIT 1");
        $st->execute(['id' => $id]);
        $row = $st->fetch();
        return $row ?: null;
    }

    public function create(string $email, string $name, string $passwordHash, string $role): int
    {
        $st = $this->pdo->prepare(
            "INSERT INTO users (email, name, passwordhash, role) VALUES (:email, :name, :ph, :role)"
        );
        $st->execute([
            'email' => $email,
            'name' => $name,
            'ph' => $passwordHash,
            'role' => $role,
        ]);
        return (int)$this->pdo->lastInsertId();
    }
}
