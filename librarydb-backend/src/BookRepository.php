<?php
declare(strict_types=1);

final class BookRepository
{
    public function __construct(private Database $db) {}

    public function exists(string $openlibraryid): bool
    {
        $st = $this->db->pdo()->prepare('SELECT 1 FROM book WHERE openlibraryid = ? LIMIT 1');
        $st->execute([$openlibraryid]);
        return (bool)$st->fetchColumn();
    }

    /**
     * Inserts or updates a book record from Open Library data.
     *
     * Required fields: openlibraryid, title
     * Optional: isbn, author, releaseyear, publisher, language, pages
     *
     * MariaDB-compatible upsert (uses VALUES(col) in ON DUPLICATE KEY UPDATE). [web:225]
     */
    public function upsertFromOpenLibrary(array $book): void
    {
        $olid = trim((string)($book['openlibraryid'] ?? ''));
        $title = trim((string)($book['title'] ?? ''));

        if ($olid === '') {
            throw new \InvalidArgumentException('Book must have a non-empty openlibraryid');
        }
        if ($title === '') {
            throw new \InvalidArgumentException('Book must have a non-empty title');
        }

        $isbn = $this->normString($book['isbn'] ?? null);
        $author = $this->normString($book['author'] ?? null);
        $publisher = $this->normString($book['publisher'] ?? null);
        $language = $this->normString($book['language'] ?? null);
        $releaseyear = $this->normYear($book['releaseyear'] ?? null);
        $pages = $this->normInt($book['pages'] ?? null);

        $sql = <<<'SQL'
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
SQL;

        $st = $this->db->pdo()->prepare($sql);
        $st->execute([
            ':openlibraryid' => $olid,
            ':isbn' => $isbn,
            ':title' => $title,
            ':author' => $author,
            ':releaseyear' => $releaseyear,
            ':publisher' => $publisher,
            ':language' => $language,
            ':pages' => $pages,
        ]);
    }

    private function normString(mixed $v): ?string
    {
        if ($v === null) return null;
        $s = trim((string)$v);
        return $s === '' ? null : $s;
    }

    private function normInt(mixed $v): ?int
    {
        if ($v === null) return null;
        if (is_array($v)) return $this->normInt($v[0] ?? null);
        if (is_int($v)) return $v;
        if (is_numeric($v)) return (int)$v;
        return null;
    }

    private function normYear(mixed $v): ?int
    {
        $y = $this->normInt($v);
        if ($y === null) return null;
        // Keep it simple and safe for YEAR columns / your app logic
        return ($y >= 0 && $y <= 9999) ? $y : null;
    }
}
