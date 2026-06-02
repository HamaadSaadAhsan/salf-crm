<?php

namespace App\Support;

use App\Models\Lead;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;

/**
 * Keyset (seek) pagination helper for the leads list.
 *
 * The leads table uses a UUID primary key, which Meilisearch cannot range-filter.
 * A dedicated numeric `seq` column provides a unique, monotonic tiebreaker that both
 * Postgres and the search index can sort and range-filter, enabling stable keyset
 * pagination with no offset scans and no page numbers.
 *
 * Cursor payload (base64 of JSON):
 *   - v:   schema version
 *   - m:   mode — "keyset" or "offset" (Meilisearch fallback for string sort fields)
 *   - sb:  sort key the cursor was built for (invalidates if the sort changes)
 *   - so:  sort direction ("asc"|"desc")
 *   - sv:  last row's sort-field value (keyset mode)
 *   - seq: last row's unique seq (keyset mode)
 *   - off: next offset (offset mode)
 */
class LeadKeyset
{
    /**
     * Real-column sort fields eligible for keyset pagination.
     *
     * @var array<string, array{db: string, meili: string, type: string, nullable: bool}>
     */
    private const FIELDS = [
        'created_at' => ['db' => 'created_at', 'meili' => 'created_at_timestamp', 'type' => 'date', 'nullable' => false],
        'updated_at' => ['db' => 'updated_at', 'meili' => 'updated_at_timestamp', 'type' => 'date', 'nullable' => false],
        'last_activity_at' => ['db' => 'last_activity_at', 'meili' => 'last_activity_at_timestamp', 'type' => 'date', 'nullable' => true],
        'next_follow_up_at' => ['db' => 'next_follow_up_at', 'meili' => 'next_follow_up_at_timestamp', 'type' => 'date', 'nullable' => true],
        'assigned_date' => ['db' => 'assigned_date', 'meili' => 'assigned_date_timestamp', 'type' => 'date', 'nullable' => true],
        'name' => ['db' => 'name', 'meili' => 'name', 'type' => 'string', 'nullable' => true],
        'email' => ['db' => 'email', 'meili' => 'email', 'type' => 'string', 'nullable' => true],
        'lead_score' => ['db' => 'lead_score', 'meili' => 'lead_score', 'type' => 'number', 'nullable' => true],
        'inquiry_status' => ['db' => 'inquiry_status', 'meili' => 'inquiry_status', 'type' => 'string', 'nullable' => false],
        'priority' => ['db' => 'priority', 'meili' => 'priority', 'type' => 'string', 'nullable' => false],
    ];

    private const DATE_SENTINEL = '1970-01-01 00:00:00';

    private const STRING_SENTINEL = '';

    /**
     * Resolve the requested sort into a supported keyset descriptor.
     *
     * @return array{key: string, db: string, meili: string, type: string, nullable: bool, dir: string}
     */
    public static function resolveSort(array $filters): array
    {
        $key = $filters['sort_by'] ?? 'created_at';
        if (! isset(self::FIELDS[$key])) {
            $key = 'created_at';
        }

        $dir = strtolower((string) ($filters['sort_order'] ?? 'desc'));
        if (! in_array($dir, ['asc', 'desc'], true)) {
            $dir = 'desc';
        }

        return self::FIELDS[$key] + ['key' => $key, 'dir' => $dir];
    }

    public static function encode(array $payload): string
    {
        return base64_encode(json_encode($payload));
    }

    public static function decode(?string $cursor): ?array
    {
        if (empty($cursor)) {
            return null;
        }

        $json = base64_decode($cursor, true);
        if ($json === false) {
            return null;
        }

        $data = json_decode($json, true);

        return is_array($data) ? $data : null;
    }

    /**
     * Return the cursor only if it was built for the current sort; otherwise null
     * so pagination restarts from the first page when the sort changes.
     */
    public static function cursorForSort(?array $cursor, array $sort): ?array
    {
        if ($cursor === null) {
            return null;
        }

        if (($cursor['sb'] ?? null) !== $sort['key'] || ($cursor['so'] ?? null) !== $sort['dir']) {
            return null;
        }

        return $cursor;
    }

    /**
     * Apply keyset ordering and the seek predicate to a database query.
     *
     * @param  array{key: string, db: string, meili: string, type: string, nullable: bool, dir: string}  $sort
     */
    public static function applyDatabaseKeyset(EloquentBuilder $query, array $sort, ?array $cursor): void
    {
        $dir = $sort['dir'];
        $cmp = $dir === 'desc' ? '<' : '>';

        if ($sort['nullable']) {
            $expr = self::coalesceExpr($sort['db'], $sort['type']);
            $query->orderByRaw("{$expr} {$dir}")->orderBy('seq', $dir);
        } else {
            $query->orderBy($sort['db'], $dir)->orderBy('seq', $dir);
        }

        if ($cursor === null || ! isset($cursor['sv'], $cursor['seq'])) {
            return;
        }

        $bind = $cursor['sv'];
        $lastSeq = (int) $cursor['seq'];

        if ($sort['nullable']) {
            $expr = self::coalesceExpr($sort['db'], $sort['type']);
            $query->where(function (EloquentBuilder $q) use ($expr, $cmp, $bind, $lastSeq): void {
                $q->whereRaw("{$expr} {$cmp} ?", [$bind])
                    ->orWhere(function (EloquentBuilder $q2) use ($expr, $bind, $cmp, $lastSeq): void {
                        $q2->whereRaw("{$expr} = ?", [$bind])
                            ->where('seq', $cmp, $lastSeq);
                    });
            });

            return;
        }

        // Non-nullable column: a row-value (tuple) comparison resolves to a true
        // index-range seek on the `(field, seq)` composite index — no BitmapOr,
        // no extra sort, no scan-and-discard of rows before the cursor boundary.
        $query->whereRaw("({$sort['db']}, seq) {$cmp} (?, ?)", [$bind, $lastSeq]);
    }

    /**
     * Build the next-page cursor from the last row of the current page.
     *
     * @param  array{key: string, db: string, meili: string, type: string, nullable: bool, dir: string}  $sort
     */
    public static function nextCursor(Lead $last, array $sort): string
    {
        return self::encode([
            'v' => 1,
            'm' => 'keyset',
            'sb' => $sort['key'],
            'so' => $sort['dir'],
            'sv' => self::sortValueForCursor($last->{$sort['db']}, $sort['type']),
            'seq' => (int) $last->seq,
        ]);
    }

    /**
     * Meilisearch can only range-filter numbers, so string sort fields fall back to
     * offset-cursor pagination on the search path.
     *
     * @param  array{type: string}  $sort
     */
    public static function searchMode(array $sort): string
    {
        return in_array($sort['type'], ['date', 'number'], true) ? 'keyset' : 'offset';
    }

    /**
     * Build the Meilisearch keyset filter clause, or null when not applicable.
     *
     * @param  array{key: string, meili: string, type: string, dir: string}  $sort
     */
    public static function searchKeysetFilter(array $sort, ?array $cursor): ?string
    {
        if ($cursor === null || self::searchMode($sort) !== 'keyset') {
            return null;
        }

        if (! isset($cursor['sv'], $cursor['seq'])) {
            return null;
        }

        $field = $sort['meili'];
        $cmp = $sort['dir'] === 'desc' ? '<' : '>';
        $value = self::meiliBound($cursor['sv'], $sort['type']);
        $seq = (int) $cursor['seq'];

        return "(({$field} {$cmp} {$value}) OR ({$field} = {$value} AND seq {$cmp} {$seq}))";
    }

    /**
     * Ordered Meilisearch sort clauses (field + direction pairs).
     *
     * @param  array{meili: string, dir: string, type: string}  $sort
     * @return array<int, array{0: string, 1: string}>
     */
    public static function searchSort(array $sort): array
    {
        if (self::searchMode($sort) === 'keyset') {
            return [[$sort['meili'], $sort['dir']], ['seq', $sort['dir']]];
        }

        return [[$sort['meili'], $sort['dir']]];
    }

    /**
     * Resolve the starting offset for the Meilisearch offset-fallback mode.
     *
     * @param  array{key: string}  $sort
     */
    public static function searchOffset(?array $cursor, array $sort): int
    {
        if ($cursor !== null
            && ($cursor['m'] ?? null) === 'offset'
            && ($cursor['sb'] ?? null) === $sort['key']
        ) {
            return max(0, (int) ($cursor['off'] ?? 0));
        }

        return 0;
    }

    /**
     * Build the next-page cursor for the Meilisearch offset-fallback mode.
     *
     * @param  array{key: string, dir: string}  $sort
     */
    public static function searchOffsetCursor(array $sort, int $nextOffset): string
    {
        return self::encode([
            'v' => 1,
            'm' => 'offset',
            'sb' => $sort['key'],
            'so' => $sort['dir'],
            'off' => max(0, $nextOffset),
        ]);
    }

    private static function coalesceExpr(string $column, string $type): string
    {
        $sentinel = match ($type) {
            'number' => '0',
            'string' => "'".self::STRING_SENTINEL."'",
            default => "'".self::DATE_SENTINEL."'",
        };

        return "COALESCE({$column}, {$sentinel})";
    }

    private static function sortValueForCursor(mixed $raw, string $type): string|int
    {
        if ($raw === null) {
            return match ($type) {
                'number' => 0,
                'string' => self::STRING_SENTINEL,
                default => self::DATE_SENTINEL,
            };
        }

        if ($type === 'date') {
            return $raw instanceof CarbonInterface
                ? $raw->format('Y-m-d H:i:s.u')
                : (string) $raw;
        }

        if ($type === 'number') {
            return (int) $raw;
        }

        return (string) $raw;
    }

    private static function meiliBound(mixed $sortValue, string $type): int
    {
        if ($type === 'date') {
            return (int) strtotime((string) $sortValue);
        }

        return (int) $sortValue;
    }
}
