<?php

use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use App\Support\LeadKeyset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    Role::create(['name' => 'super-admin', 'guard_name' => 'web']);
    $this->admin = User::factory()->create(['email_verified_at' => now()]);
    $this->admin->assignRole('super-admin');
});

/**
 * Fetch one keyset page and return [ids, has_more, next_cursor].
 */
function fetchLeadsPage(string $url): array
{
    $captured = ['ids' => [], 'has_more' => null, 'next' => null];

    test()->actingAs(test()->admin)
        ->get($url)
        ->assertSuccessful()
        ->assertInertia(function (Assert $page) use (&$captured) {
            $page->component('leads/index')
                ->where('leads', function ($leads) use (&$captured) {
                    $captured['ids'] = collect($leads)->pluck('id')->all();

                    return true;
                })
                ->where('meta.has_more', function ($hasMore) use (&$captured) {
                    $captured['has_more'] = $hasMore;

                    return true;
                })
                ->where('meta.next_cursor', function ($cursor) use (&$captured) {
                    $captured['next'] = $cursor;

                    return true;
                })
                ->etc();
        });

    return $captured;
}

test('keyset pagination walks the whole list with no overlaps and no page numbers', function () {
    Lead::factory()->count(25)->create();

    $page1 = fetchLeadsPage('/leads?per_page=10');
    expect($page1['ids'])->toHaveCount(10)
        ->and($page1['has_more'])->toBeTrue()
        ->and($page1['next'])->not->toBeNull();

    $page2 = fetchLeadsPage('/leads?per_page=10&cursor='.urlencode($page1['next']));
    expect($page2['ids'])->toHaveCount(10)
        ->and($page2['has_more'])->toBeTrue()
        ->and($page2['next'])->not->toBeNull();

    $page3 = fetchLeadsPage('/leads?per_page=10&cursor='.urlencode($page2['next']));
    expect($page3['ids'])->toHaveCount(5)
        ->and($page3['has_more'])->toBeFalse()
        ->and($page3['next'])->toBeNull();

    $all = array_merge($page1['ids'], $page2['ids'], $page3['ids']);
    expect($all)->toHaveCount(25)
        ->and(array_unique($all))->toHaveCount(25);
});

test('meta exposes no offset/page-number fields', function () {
    Lead::factory()->count(3)->create();

    test()->actingAs($this->admin)
        ->get('/leads?per_page=10')
        ->assertInertia(fn (Assert $page) => $page
            ->component('leads/index')
            ->where('meta.has_more', false)
            ->where('meta.next_cursor', null)
            ->where('meta.per_page', 10)
            ->missing('meta.current_page')
            ->missing('meta.last_page')
            ->missing('meta.total')
            ->etc()
        );
});

test('keyset is stable across a descending lead_score sort with tied scores', function () {
    // Many identical scores force the unique seq tiebreaker to do the work.
    Lead::factory()->count(15)->create(['lead_score' => 50]);

    $page1 = fetchLeadsPage('/leads?per_page=10&sort_by=lead_score&sort_order=desc');
    expect($page1['ids'])->toHaveCount(10)
        ->and($page1['has_more'])->toBeTrue();

    $page2 = fetchLeadsPage('/leads?per_page=10&sort_by=lead_score&sort_order=desc&cursor='.urlencode($page1['next']));
    expect($page2['ids'])->toHaveCount(5)
        ->and($page2['has_more'])->toBeFalse();

    $all = array_merge($page1['ids'], $page2['ids']);
    expect(array_unique($all))->toHaveCount(15);
});

test('changing the sort invalidates a stale cursor instead of corrupting results', function () {
    Lead::factory()->count(15)->create();

    $page1 = fetchLeadsPage('/leads?per_page=10');

    // Feed a created_at cursor into a lead_score sort — it must be ignored and
    // the request must start from the first page of the new sort.
    $reused = fetchLeadsPage('/leads?per_page=10&sort_by=lead_score&sort_order=desc&cursor='.urlencode($page1['next']));

    expect($reused['ids'])->toHaveCount(10)
        ->and($reused['has_more'])->toBeTrue();
});

test('keyset walks the whole list with no overlap across every sort field and direction', function (string $sortBy, string $dir) {
    // Mix of present and NULL values on the nullable sort columns so the
    // COALESCE seek path and the unique seq tiebreaker are both exercised.
    Lead::factory()->count(20)->create();
    Lead::factory()->count(8)->create([
        'last_activity_at' => null,
        'next_follow_up_at' => null,
        'assigned_date' => null,
        'lead_score' => null,
    ]);

    $seen = [];
    $url = "/leads?per_page=10&sort_by={$sortBy}&sort_order={$dir}";
    $guard = 0;

    do {
        $page = fetchLeadsPage($url);
        $seen = array_merge($seen, $page['ids']);
        $url = "/leads?per_page=10&sort_by={$sortBy}&sort_order={$dir}&cursor=".urlencode((string) $page['next']);
    } while ($page['has_more'] && $page['next'] !== null && ++$guard < 20);

    expect($seen)->toHaveCount(28)
        ->and(array_unique($seen))->toHaveCount(28);
})->with([
    'created_at desc' => ['created_at', 'desc'],
    'created_at asc' => ['created_at', 'asc'],
    'updated_at desc' => ['updated_at', 'desc'],
    'lead_score desc' => ['lead_score', 'desc'],
    'lead_score asc' => ['lead_score', 'asc'],
    'last_activity_at desc' => ['last_activity_at', 'desc'],
    'next_follow_up_at asc' => ['next_follow_up_at', 'asc'],
    'name asc' => ['name', 'asc'],
    'email desc' => ['email', 'desc'],
    'priority desc' => ['priority', 'desc'],
]);

test('applyDatabaseKeyset emits a row-value seek for non-nullable sort fields', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'created_at', 'sort_order' => 'desc']);
    $cursor = ['sb' => 'created_at', 'so' => 'desc', 'sv' => '2026-01-01 00:00:00', 'seq' => 7];

    $query = Lead::query();
    LeadKeyset::applyDatabaseKeyset($query, $sort, $cursor);
    $sql = strtolower($query->toSql());

    expect($sql)->toContain('(created_at, seq) < (?, ?)')
        ->and($sql)->not->toContain('coalesce');
});

test('applyDatabaseKeyset emits a COALESCE OR-seek for nullable sort fields', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'lead_score', 'sort_order' => 'asc']);
    $cursor = ['sb' => 'lead_score', 'so' => 'asc', 'sv' => 50, 'seq' => 7];

    $query = Lead::query();
    LeadKeyset::applyDatabaseKeyset($query, $sort, $cursor);
    $sql = strtolower($query->toSql());

    expect($sql)->toContain('coalesce(lead_score, 0)')
        ->and($sql)->toContain('"seq" >');
});

test('the leads grid issues a constant number of queries regardless of lead count (no N+1 on task assignees)', function () {
    $assignee = User::factory()->create();

    $seedLeadsWithAssignedTasks = function (int $count) use ($assignee): void {
        Lead::factory()->count($count)->create()->each(function (Lead $lead) use ($assignee) {
            Task::factory()->create([
                'taskable_type' => Lead::class,
                'taskable_id' => $lead->id,
                'status' => 'pending',
                'assigned_to_id' => $assignee->id,
                'due_at' => now()->addDay(),
            ]);
        });
    };

    $countGridQueries = function (): int {
        // The grid result is cached; flush so each measured request recomputes
        // against the live dataset rather than serving a stale cached page.
        cache()->flush();
        DB::flushQueryLog();
        DB::enableQueryLog();
        test()->actingAs(test()->admin)->get('/leads?per_page=50')->assertSuccessful();
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    };

    $seedLeadsWithAssignedTasks(5);
    $small = $countGridQueries();

    $seedLeadsWithAssignedTasks(15);
    $large = $countGridQueries();

    // The query count must not grow with the number of leads. An N+1 (per-lead
    // task assignee or per-source lead-count accessor) made the larger page issue
    // strictly more queries; with eager loading the count stays flat or lower.
    expect($large)->toBeLessThanOrEqual($small);
});

test('applyDatabaseKeyset without a cursor only orders (no seek predicate)', function () {
    $sort = LeadKeyset::resolveSort(['sort_by' => 'created_at', 'sort_order' => 'desc']);

    $query = Lead::query();
    LeadKeyset::applyDatabaseKeyset($query, $sort, null);
    $sql = strtolower($query->toSql());

    expect($sql)->toContain('order by')
        ->and($sql)->not->toContain('(created_at, seq) <');
});
