<?php
declare(strict_types=1);

final class BookMapper
{
    /**
     * Backwards-compatible wrapper.
     * Some existing controller code calls: BookMapper::fromEditionJson($edition, $olid)
     */
    public static function fromEditionJson(array $edition, string $olid = ''): array
    {
        $m = new self();
        return $m->mapEdition($edition, $olid !== '' ? $olid : null, null);
    }

    /**
     * Maps an Open Library *edition* JSON payload into your internal book shape.
     *
     * Pass $work (optional) if you also fetched the related work and want better fallbacks.
     */
    public function mapEdition(array $edition, ?string $olid = null, ?array $work = null): array
    {
        $olid = $olid
            ?? (is_string($edition['key'] ?? null) ? $this->olidFromKey($edition['key']) : null)
            ?? (is_string($edition['olid'] ?? null) ? $edition['olid'] : '');

        $title = $this->string($edition['title'] ?? '');
        $publisher = $this->firstString($edition['publishers'] ?? null)
            ?: $this->string($edition['publisher'] ?? '');

        $pages = $this->intOrNull($edition['number_of_pages'] ?? null)
            ?? $this->intOrNull($edition['pages'] ?? null);

        // Language: edition.languages is often like [{key:"/languages/eng"}]
        $lang = '';
        if (is_array($edition['languages'] ?? null) && isset($edition['languages'][0])) {
            $langKey = $edition['languages'][0]['key'] ?? null;
            if (is_string($langKey) && preg_match('~^/languages/([a-z]{3})~i', $langKey, $m)) {
                $lang = strtolower($m[1]); // eng, hun, ...
            }
        }
        $lang = $lang ?: $this->string($edition['language'] ?? '');

        // Prefer ISBN-13, then ISBN-10
        $isbn = '';
        if (is_array($edition['isbn_13'] ?? null) && isset($edition['isbn_13'][0])) {
            $isbn = $this->string($edition['isbn_13'][0]);
        } elseif (is_array($edition['isbn_10'] ?? null) && isset($edition['isbn_10'][0])) {
            $isbn = $this->string($edition['isbn_10'][0]);
        } elseif (is_string($edition['isbn'] ?? null)) {
            $isbn = $this->string($edition['isbn']);
        }

        // Author: best-effort (edition often contains only author keys, not names)
        $author = '';
        if (is_string($edition['by_statement'] ?? null)) {
            $author = $this->string($edition['by_statement']);
        } elseif (is_string($edition['author'] ?? null)) {
            $author = $this->string($edition['author']);
        } elseif (is_array($work) && is_string($work['by_statement'] ?? null)) {
            $author = $this->string($work['by_statement']);
        }

        // Publish year: prefer edition.publish_date; fallback to work-level fields if provided
        $year =
            $this->extractYear($edition['publish_date'] ?? null)
            ?? $this->extractYear($edition['publish_year'] ?? null)
            ?? (is_array($work) ? (
                $this->extractYear($work['first_publish_date'] ?? null)
                ?? $this->extractYear($work['created']['value'] ?? null)
            ) : null);

        // Description: can be a string or an object like { value: "..." }
        $desc =
            $this->normalizeDescription($edition['description'] ?? null)
            ?: (is_array($work) ? $this->normalizeDescription($work['description'] ?? null) : '');

        // Subjects: edition has subjects sometimes; work often has more
        $subjects = $this->normalizeSubjects($edition['subjects'] ?? null);
        if (!$subjects && is_array($work)) {
            $subjects = $this->normalizeSubjects($work['subjects'] ?? null);
        }

        // Covers: edition.covers is usually an array of cover IDs
        $coverId = null;
        if (is_array($edition['covers'] ?? null) && isset($edition['covers'][0]) && is_numeric($edition['covers'][0])) {
            $coverId = (int)$edition['covers'][0];
        } elseif (is_numeric($edition['cover_i'] ?? null)) {
            $coverId = (int)$edition['cover_i'];
        }

        $coverUrl = $coverId ? "https://covers.openlibrary.org/b/id/{$coverId}-L.jpg" : null;

        return [
            // Keep your original keys (backend expects these)
            'openlibraryid' => $olid,
            'isbn' => $isbn,
            'title' => $title,
            'author' => $author,
            'releaseyear' => $year,
            'publisher' => $publisher !== '' ? $publisher : null,
            'language' => $lang !== '' ? $lang : null,
            'pages' => $pages,

            // Optional extras (safe to ignore if your DB doesn't store them)
            'description' => $desc,
            'subjects' => $subjects,
            'coveri' => $coverId,
            'coverurl' => $coverUrl,
        ];
    }

    private function normalizeDescription(mixed $description): string
    {
        $txt = '';

        if (is_string($description)) {
            $txt = $description;
        } elseif (is_array($description) && is_string($description['value'] ?? null)) {
            $txt = $description['value'];
        } else {
            $txt = '';
        }

        $txt = html_entity_decode($txt, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $txt = strip_tags($txt);

        $txt = preg_replace("/[ \t]+/", " ", $txt) ?? $txt;
        $txt = preg_replace("/\r\n|\r/", "\n", $txt) ?? $txt;
        $txt = preg_replace("/\n{3,}/", "\n\n", $txt) ?? $txt;

        return trim($txt);
    }

    private function normalizeSubjects(mixed $subjects): array
    {
        if (!is_array($subjects)) return [];

        $out = [];
        foreach ($subjects as $s) {
            if (!is_string($s)) continue;
            $s = trim($s);
            if ($s === '') continue;
            $out[] = $s;
        }

        $out = array_values(array_unique($out));
        if (count($out) > 50) $out = array_slice($out, 0, 50);

        return $out;
    }

    private function extractYear(mixed $value): ?int
    {
        if (is_int($value)) return ($value >= 0 && $value <= 9999) ? $value : null;

        if (is_array($value) && isset($value[0])) {
            return $this->extractYear($value[0]);
        }

        $s = $this->string($value);
        if ($s === '') return null;

        if (preg_match('/(\d{4})/', $s, $m)) {
            return (int)$m[1];
        }

        return null;
    }

    private function olidFromKey(string $key): ?string
    {
        // "/books/OL3778206M" -> "OL3778206M"
        if (preg_match('~/(books|works)/([A-Z0-9]+[MW])~i', $key, $m)) {
            return $m[2];
        }
        return null;
    }

    private function string(mixed $v): string
    {
        return is_string($v) ? trim($v) : '';
    }

    private function firstString(mixed $v): string
    {
        if (is_string($v)) return trim($v);
        if (!is_array($v) || !isset($v[0]) || !is_string($v[0])) return '';
        return trim($v[0]);
    }

    private function intOrNull(mixed $v): ?int
    {
        if (is_int($v)) return $v;
        if (is_numeric($v)) return (int)$v;
        return null;
    }
}
