<?php
declare(strict_types=1);

final class BookMapper
{
    public static function fromEditionJson(array $edition, string $olid): array
    {
        $title = (string)($edition['title'] ?? '');
        $publishDate = (string)($edition['publish_date'] ?? '');
        preg_match('/(\d{4})/', $publishDate, $m);
        $year = isset($m[1]) ? (int)$m[1] : 2000;

        $publisher = null;
        if (isset($edition['publishers']) && is_array($edition['publishers']) && isset($edition['publishers'][0])) {
            $publisher = (string)$edition['publishers'][0];
        }

        $pages = isset($edition['number_of_pages']) ? (int)$edition['number_of_pages'] : null;

        $isbn = '';
        if (isset($edition['isbn_13'][0])) $isbn = (string)$edition['isbn_13'][0];
        else if (isset($edition['isbn_10'][0])) $isbn = (string)$edition['isbn_10'][0];

        $author = (string)($edition['by_statement'] ?? 'Unknown');

        $lang = 'en';
        if (isset($edition['languages'][0]['key'])) {
            $key = (string)$edition['languages'][0]['key']; // "/languages/eng"
            $lang = substr($key, strrpos($key, '/') + 1, 2) ?: 'en';
        }

        return [
            'openlibraryid' => $olid,
            'isbn' => $isbn,
            'title' => $title,
            'author' => $author,
            'releaseyear' => $year,
            'publisher' => $publisher,
            'language' => $lang,
            'pages' => $pages,
        ];
    }
}
