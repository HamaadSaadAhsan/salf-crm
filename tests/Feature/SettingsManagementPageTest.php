<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

test('super admin can access settings management page', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->get('/settings/management');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page->component('settings/management/index'));
});

test('non super admin users cannot access settings management page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings/management');

    $response->assertRedirect();
});

test('unauthenticated users are redirected to login', function () {
    $response = $this->get('/settings/management');

    $response->assertRedirect('/login');
});

test('settings management page has correct title', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $response = $this->actingAs($user)->get('/settings/management');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/management/index')
    );
});
