<?php

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
