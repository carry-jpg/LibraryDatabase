<?php
declare(strict_types=1);

final class BookRepository
{
    public function __construct(private Database $db) {}

    public function exists(string $openlibraryid): bool
    {
        $st = $this->db->pdo()->prepare("SELECT 1 FROM book WHERE openlibraryid = ? LIMIT 1");
        $st->execute([$openlibraryid]);
        return (bool)$st->fetchColumn();
    }

    public function upsertFromOpenLibrary(array $book): void
    {
        $sql = "
INSERT INTO book (openlibraryid, isbn, title, author, releaseyear, publisher, language, pages)
VALUES (:openlibraryid, :isbn, :title, :author, :releaseyear, :publisher, :language, :pages)
ON DUPLICATE KEY UPDATE
  isbn = VALUES(isbn),
  title = VALUES(title),
  author = VALUES(author),
  releaseyear = VALUES(releaseyear),
  publisher = VALUES(publisher),
  language = VALUES(language),
  pages = VALUES(pages)
";
        $st = $this->db->pdo()->prepare($sql);
        $st->execute([
            ':openlibraryid' => $book['openlibraryid'],
            ':isbn' => $book['isbn'] ?? '',
            ':title' => $book['title'] ?? '',
            ':author' => $book['author'] ?? '',
            ':releaseyear' => $book['releaseyear'] ?? 2000,
            ':publisher' => $book['publisher'] ?? null,
            ':language' => $book['language'] ?? 'en',
            ':pages' => $book['pages'] ?? null,
        ]);
    }
}
