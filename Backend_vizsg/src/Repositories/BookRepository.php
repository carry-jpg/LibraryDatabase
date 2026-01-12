<?php
// final class BookRepository {
//   public function __construct(private PDO $pdo) {}

//   public function upsertFromOpenLibrary(array $book): void {
//     $sql = "INSERT INTO book (openlibraryid, isbn, title, author, release_year, publisher, language, pages)
//             VALUES (:olid, :isbn, :title, :author, :year, :publisher, :lang, :pages)
//             ON DUPLICATE KEY UPDATE
//               isbn=VALUES(isbn),
//               title=VALUES(title),
//               author=VALUES(author),
//               release_year=VALUES(release_year),
//               publisher=VALUES(publisher),
//               language=VALUES(language),
//               pages=VALUES(pages)";
//     $stmt = $this->pdo->prepare($sql);
//     $stmt->execute([
//       ':olid' => $book['openlibraryid'],
//       ':isbn' => $book['isbn'],
//       ':title' => $book['title'],
//       ':author' => $book['author'],
//       ':year' => $book['release_year'],
//       ':publisher' => $book['publisher'] ?? null,
//       ':lang' => $book['language'],
//       ':pages' => $book['pages'] ?? null,
//     ]);
//   }
// }
declare(strict_types=1);

final class BookRepository {
  public function __construct(private PDO $pdo) {}

  public function exists(string $olid): bool {
    $stmt = $this->pdo->prepare("SELECT 1 FROM book WHERE openlibraryid = ? LIMIT 1");
    $stmt->execute([$olid]);
    return (bool)$stmt->fetchColumn();
  }

  public function upsertFromOpenLibrary(array $book): void {
    $sql = "INSERT INTO book (openlibraryid, isbn, title, author, release_year, publisher, language, pages)
            VALUES (:olid, :isbn, :title, :author, :year, :publisher, :lang, :pages)
            ON DUPLICATE KEY UPDATE
              isbn=VALUES(isbn),
              title=VALUES(title),
              author=VALUES(author),
              release_year=VALUES(release_year),
              publisher=VALUES(publisher),
              language=VALUES(language),
              pages=VALUES(pages)";
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute([
      ':olid' => $book['openlibraryid'],
      ':isbn' => $book['isbn'],
      ':title' => $book['title'],
      ':author' => $book['author'],
      ':year' => $book['release_year'],
      ':publisher' => $book['publisher'] ?? null,
      ':lang' => $book['language'],
      ':pages' => $book['pages'] ?? null,
    ]);
  }
}

