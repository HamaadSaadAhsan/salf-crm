<?php

use App\Models\SavedFilter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can list saved filters for the authenticated user', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $otherUser = User::factory()->create(['email_verified_at' => now()]);

    SavedFilter::create([
        'user_id' => $user->id,
        'name' => 'My Preset',
        'filters' => ['status' => ['new']],
    ]);

    SavedFilter::create([
        'user_id' => $otherUser->id,
        'name' => 'Other Preset',
        'filters' => ['status' => ['won']],
    ]);

    $response = $this->actingAs($user)->getJson('/api/saved-filters');

    $response->assertOk();
    $response->assertJsonCount(1);
    $response->assertJsonFragment(['name' => 'My Preset']);
});

it('can create a saved filter', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($user)->postJson('/api/saved-filters', [
        'name' => 'Hot Leads',
        'filters' => ['status' => ['new', 'contacted'], 'priority' => 'high'],
        'color' => 'red',
    ]);

    $response->assertCreated();
    $response->assertJsonFragment(['name' => 'Hot Leads']);

    expect(SavedFilter::count())->toBe(1);

    $filter = SavedFilter::first();
    expect($filter->name)->toBe('Hot Leads');
    expect($filter->filters)->toBe(['status' => ['new', 'contacted'], 'priority' => 'high']);
    expect($filter->color)->toBe('red');
    expect($filter->user_id)->toBe($user->id);
});

it('validates required fields when creating a saved filter', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($user)->postJson('/api/saved-filters', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name', 'filters']);
});

it('enforces unique name per user', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    SavedFilter::create([
        'user_id' => $user->id,
        'name' => 'My Preset',
        'filters' => ['status' => ['new']],
    ]);

    $response = $this->actingAs($user)->postJson('/api/saved-filters', [
        'name' => 'My Preset',
        'filters' => ['status' => ['won']],
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['name']);
});

it('allows same name for different users', function () {
    $user1 = User::factory()->create(['email_verified_at' => now()]);
    $user2 = User::factory()->create(['email_verified_at' => now()]);

    SavedFilter::create([
        'user_id' => $user1->id,
        'name' => 'Shared Name',
        'filters' => ['status' => ['new']],
    ]);

    $response = $this->actingAs($user2)->postJson('/api/saved-filters', [
        'name' => 'Shared Name',
        'filters' => ['status' => ['won']],
    ]);

    $response->assertCreated();
});

it('can update a saved filter', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $filter = SavedFilter::create([
        'user_id' => $user->id,
        'name' => 'Old Name',
        'filters' => ['status' => ['new']],
    ]);

    $response = $this->actingAs($user)->putJson("/api/saved-filters/{$filter->id}", [
        'name' => 'New Name',
        'filters' => ['status' => ['won'], 'priority' => 'urgent'],
        'color' => 'blue',
    ]);

    $response->assertOk();
    $response->assertJsonFragment(['name' => 'New Name']);

    $filter->refresh();
    expect($filter->name)->toBe('New Name');
    expect($filter->filters)->toBe(['status' => ['won'], 'priority' => 'urgent']);
    expect($filter->color)->toBe('blue');
});

it('prevents updating another user\'s saved filter', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $otherUser = User::factory()->create(['email_verified_at' => now()]);

    $filter = SavedFilter::create([
        'user_id' => $otherUser->id,
        'name' => 'Not Mine',
        'filters' => ['status' => ['new']],
    ]);

    $response = $this->actingAs($user)->putJson("/api/saved-filters/{$filter->id}", [
        'name' => 'Hacked',
        'filters' => ['status' => ['won']],
    ]);

    $response->assertForbidden();
});

it('can delete a saved filter', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $filter = SavedFilter::create([
        'user_id' => $user->id,
        'name' => 'To Delete',
        'filters' => ['status' => ['new']],
    ]);

    $response = $this->actingAs($user)->deleteJson("/api/saved-filters/{$filter->id}");

    $response->assertNoContent();
    expect(SavedFilter::count())->toBe(0);
});

it('prevents deleting another user\'s saved filter', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $otherUser = User::factory()->create(['email_verified_at' => now()]);

    $filter = SavedFilter::create([
        'user_id' => $otherUser->id,
        'name' => 'Not Mine',
        'filters' => ['status' => ['new']],
    ]);

    $response = $this->actingAs($user)->deleteJson("/api/saved-filters/{$filter->id}");

    $response->assertForbidden();
    expect(SavedFilter::count())->toBe(1);
});

it('resets other defaults when setting a filter as default', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $existingDefault = SavedFilter::create([
        'user_id' => $user->id,
        'name' => 'Old Default',
        'filters' => ['status' => ['new']],
        'is_default' => true,
    ]);

    $response = $this->actingAs($user)->postJson('/api/saved-filters', [
        'name' => 'New Default',
        'filters' => ['status' => ['won']],
        'is_default' => true,
    ]);

    $response->assertCreated();

    $existingDefault->refresh();
    expect($existingDefault->is_default)->toBeFalse();

    $newFilter = SavedFilter::where('name', 'New Default')->first();
    expect($newFilter->is_default)->toBeTrue();
});

it('requires authentication to access saved filters', function () {
    $response = $this->getJson('/api/saved-filters');
    $response->assertUnauthorized();
});
