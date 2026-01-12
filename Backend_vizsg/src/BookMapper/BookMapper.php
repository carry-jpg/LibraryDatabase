<?php
declare(strict_types=1);

final class BookMapper {
  // Maps OpenLibrary edition JSON into your DB columns
  public static function fromEditionJson(array $edition, string $olid): array {
    $title = (string)($edition['title'] ?? 'Unknown title');

    // author(s) in editions can be refs; keep it simple for now
    $author = 'Unknown author';
    if (!empty($edition['by_statement']) && is_string($edition['by_statement'])) {
      $author = $edition['by_statement'];
    }

    // ISBN: prefer isbn_13 then isbn_10
    $isbn = '';
    if (!empty($edition['isbn_13'][0])) $isbn = (string)$edition['isbn_13'][0];
    elseif (!empty($edition['isbn_10'][0])) $isbn = (string)$edition['isbn_10'][0];
    else $isbn = '0000000000000'; // you may want to reject instead

    // release year
    $year = 2000;
    if (!empty($edition['publish_date']) && is_string($edition['publish_date'])) {
      if (preg_match('/\b(18|19|20)\d{2}\b/', $edition['publish_date'], $m)) {
        $year = (int)$m[0];
      }
    }

    $publisher = null;
    if (!empty($edition['publishers'][0])) $publisher = (string)$edition['publishers'][0];

    $language = 'en';
    if (!empty($edition['languages'][0]['key']) && is_string($edition['languages'][0]['key'])) {
      // e.g. "/languages/eng"
      if (preg_match('~/languages/([a-z]{3})~', $edition['languages'][0]['key'], $m)) {
        // convert 3-letter to 2-letter is non-trivial; keep default or implement a lookup later
        $language = 'en';
      }
    }

    $pages = null;
    if (isset($edition['number_of_pages']) && is_numeric($edition['number_of_pages'])) {
      $pages = (int)$edition['number_of_pages'];
    }

    return [
      'openlibraryid' => $olid,
      'isbn' => preg_replace('/[^0-9Xx]/', '', $isbn), // normalize a bit
      'title' => $title,
      'author' => $author,
      'release_year' => $year,
      'publisher' => $publisher,
      'language' => $language,
      'pages' => $pages,
    ];
  }
}
