<?php

use App\Models\Lead;
use App\Services\LeadCacheService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->cacheService = app(LeadCacheService::class);
    $this->lead = Lead::factory()->create();
});

it('always invalidates the specific lead detail cache', function () {
    Cache::tags(["lead:{$this->lead->id}"])->put('test-key', 'cached', 300);

    $this->cacheService->invalidateLeadCache($this->lead, ['name']);

    expect(Cache::tags(["lead:{$this->lead->id}"])->get('test-key'))->toBeNull();
});

it('does not invalidate list cache for detail-only field changes', function () {
    Cache::tags(['leads', 'leads_list'])->put('list-key', 'cached', 300);
    Cache::tags(['leads_stats'])->put('stats-key', 'cached', 300);

    $this->cacheService->invalidateLeadCache($this->lead, ['name', 'email', 'phone']);

    expect(Cache::tags(['leads', 'leads_list'])->get('list-key'))->toBe('cached');
    expect(Cache::tags(['leads_stats'])->get('stats-key'))->toBe('cached');
});

it('invalidates list cache when list-affecting fields change', function () {
    Cache::tags(['leads', 'leads_list'])->put('list-key', 'cached', 300);

    $this->cacheService->invalidateLeadCache($this->lead, ['city']);

    expect(Cache::tags(['leads', 'leads_list'])->get('list-key'))->toBeNull();
});

it('invalidates stats cache when stats-affecting fields change', function () {
    Cache::tags(['leads_stats'])->put('stats-key', 'cached', 300);

    $this->cacheService->invalidateLeadCache($this->lead, ['inquiry_status']);

    expect(Cache::tags(['leads_stats'])->get('stats-key'))->toBeNull();
});

it('invalidates both list and stats caches for status changes', function () {
    Cache::tags(['leads', 'leads_list'])->put('list-key', 'cached', 300);
    Cache::tags(['leads_stats'])->put('stats-key', 'cached', 300);

    $this->cacheService->invalidateLeadCache($this->lead, ['inquiry_status']);

    expect(Cache::tags(['leads', 'leads_list'])->get('list-key'))->toBeNull();
    expect(Cache::tags(['leads_stats'])->get('stats-key'))->toBeNull();
});

it('flushes everything when no changed fields are provided (backward-compatible)', function () {
    Cache::tags(["lead:{$this->lead->id}"])->put('detail-key', 'cached', 300);
    Cache::tags(['leads', 'leads_list'])->put('list-key', 'cached', 300);
    Cache::tags(['leads_stats'])->put('stats-key', 'cached', 300);

    $this->cacheService->invalidateLeadCache($this->lead);

    expect(Cache::tags(["lead:{$this->lead->id}"])->get('detail-key'))->toBeNull();
    expect(Cache::tags(['leads', 'leads_list'])->get('list-key'))->toBeNull();
    expect(Cache::tags(['leads_stats'])->get('stats-key'))->toBeNull();
});
