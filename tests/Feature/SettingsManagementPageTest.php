<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('authenticated users can access settings management page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings/management');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page->component('settings/management/index'));
});

test('unauthenticated users are redirected to login', function () {
    $response = $this->get('/settings/management');

    $response->assertRedirect('/login');
});

test('settings management page has correct title', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings/management');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/management/index')
    );
});
