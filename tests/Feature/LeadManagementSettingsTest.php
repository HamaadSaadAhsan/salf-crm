<?php

use App\Models\LeadSource;
use App\Models\Status;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('super admin can access lead sources management page', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->get('/settings/management/lead-sources');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page->component('settings/management/lead-sources/index'));
});

test('super admin can access lead statuses management page', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->get('/settings/management/lead-statuses');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page->component('settings/management/lead-statuses/index'));
});

test('non super admin users cannot access lead sources management page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings/management/lead-sources');

    $response->assertRedirect();
});

test('non super admin users cannot access lead statuses management page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings/management/lead-statuses');

    $response->assertRedirect();
});

test('lead sources management page displays lead sources', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $source1 = LeadSource::factory()->create(['name' => 'Website']);
    $source2 = LeadSource::factory()->create(['name' => 'Facebook']);

    $response = $this->actingAs($user)->get('/settings/management/lead-sources');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/management/lead-sources/index')
        ->has('leadSources')
        ->where('leadSources', function ($sources) {
            $names = collect($sources)->pluck('name')->toArray();

            return in_array('Website', $names) && in_array('Facebook', $names);
        })
    );
});

test('lead statuses management page displays statuses', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $status1 = Status::factory()->create(['name' => 'new', 'order' => 1]);
    $status2 = Status::factory()->create(['name' => 'contacted', 'order' => 2]);

    $response = $this->actingAs($user)->get('/settings/management/lead-statuses');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/management/lead-statuses/index')
        ->has('statuses', 2)
    );
});
