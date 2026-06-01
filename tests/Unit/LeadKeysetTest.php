<?php

use App\Support\LeadKeyset;

test('resolveSort falls back to created_at desc for unknown fields', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'bogus', 'sort_order' => 'sideways']);

    expect($sort['key'])->toBe('created_at')
        ->and($sort['dir'])->toBe('desc')
        ->and($sort['db'])->toBe('created_at')
        ->and($sort['meili'])->toBe('created_at_timestamp');
});

test('resolveSort honours supported field and direction', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'lead_score', 'sort_order' => 'asc']);

    expect($sort['key'])->toBe('lead_score')
        ->and($sort['dir'])->toBe('asc')
        ->and($sort['type'])->toBe('number');
});

test('cursor encode/decode round-trips', function () {
    $payload = ['v' => 1, 'm' => 'keyset', 'sb' => 'created_at', 'so' => 'desc', 'sv' => '2026-01-01 00:00:00.000000', 'seq' => 42];

    expect(LeadKeyset::decode(LeadKeyset::encode($payload)))->toBe($payload);
});

test('decode returns null for empty or malformed cursors', function () {
    expect(LeadKeyset::decode(null))->toBeNull()
        ->and(LeadKeyset::decode(''))->toBeNull()
        ->and(LeadKeyset::decode('not-base64-json!!'))->toBeNull();
});

test('cursorForSort discards a cursor built for a different sort', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'created_at', 'sort_order' => 'desc']);
    $matching = ['sb' => 'created_at', 'so' => 'desc', 'sv' => 'x', 'seq' => 1];
    $stale = ['sb' => 'name', 'so' => 'asc', 'sv' => 'x', 'seq' => 1];

    expect(LeadKeyset::cursorForSort($matching, $sort))->toBe($matching)
        ->and(LeadKeyset::cursorForSort($stale, $sort))->toBeNull()
        ->and(LeadKeyset::cursorForSort(null, $sort))->toBeNull();
});

test('searchMode uses keyset for numeric sorts and offset for string sorts', function () {
    expect(LeadKeyset::searchMode(LeadKeyset::resolveSort(['sort_by' => 'created_at'])))->toBe('keyset')
        ->and(LeadKeyset::searchMode(LeadKeyset::resolveSort(['sort_by' => 'lead_score'])))->toBe('keyset')
        ->and(LeadKeyset::searchMode(LeadKeyset::resolveSort(['sort_by' => 'name'])))->toBe('offset')
        ->and(LeadKeyset::searchMode(LeadKeyset::resolveSort(['sort_by' => 'priority'])))->toBe('offset');
});

test('searchKeysetFilter builds a composite seek predicate for numeric sorts', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'created_at', 'sort_order' => 'desc']);
    $cursor = ['sb' => 'created_at', 'so' => 'desc', 'sv' => '2026-01-01 00:00:00', 'seq' => 7];

    $filter = LeadKeyset::searchKeysetFilter($sort, $cursor);

    expect($filter)->toContain('created_at_timestamp <')
        ->and($filter)->toContain('seq < 7');
});

test('searchKeysetFilter returns null for string sorts (offset fallback)', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'name', 'sort_order' => 'asc']);
    $cursor = ['sb' => 'name', 'so' => 'asc', 'sv' => 'Acme', 'seq' => 7];

    expect(LeadKeyset::searchKeysetFilter($sort, $cursor))->toBeNull();
});

test('searchOffset reads the offset only from a matching offset cursor', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'name', 'sort_order' => 'asc']);

    expect(LeadKeyset::searchOffset(['m' => 'offset', 'sb' => 'name', 'off' => 50], $sort))->toBe(50)
        ->and(LeadKeyset::searchOffset(['m' => 'offset', 'sb' => 'email', 'off' => 50], $sort))->toBe(0)
        ->and(LeadKeyset::searchOffset(null, $sort))->toBe(0);
});
