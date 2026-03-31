<?php

use App\Models\Integration;
use App\Models\User;
use Spatie\Permission\Models\Role;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $this->user = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    $this->user->assignRole('super-admin');
});

it('shows facebook as disconnected when no integration exists', function () {
    $response = $this->actingAs($this->user)->get(route('integrations'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('integrations/index')
        ->where('statuses.facebook', false)
    );
});

it('shows facebook as connected when integration exists and is active', function () {
    Integration::create([
        'provider' => 'facebook',
        'name' => 'Facebook - Test Page',
        'config' => [
            'page_info' => ['name' => 'Test Page'],
        ],
        'active' => true,
    ]);

    $response = $this->actingAs($this->user)->get(route('integrations'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('integrations/index')
        ->where('statuses.facebook', true)
    );
});

it('shows facebook as disconnected when integration exists but is inactive', function () {
    Integration::create([
        'provider' => 'facebook',
        'name' => 'Facebook - Test Page',
        'config' => [
            'page_info' => ['name' => 'Test Page'],
        ],
        'active' => false,
    ]);

    $response = $this->actingAs($this->user)->get(route('integrations'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('integrations/index')
        ->where('statuses.facebook', false)
    );
});

it('initiates facebook oauth and returns auth url', function () {
    config([
        'services.facebook.app_id' => 'test-app-id',
        'services.facebook.app_secret' => 'test-app-secret',
        'services.facebook.redirect_uri' => 'http://localhost/facebook/callback',
        'services.facebook.api_version' => 'v23.0',
    ]);

    $response = $this->actingAs($this->user)
        ->postJson('/integrations/facebook/oauth/authorize');

    $response->assertOk();
    $response->assertJsonStructure(['success', 'auth_url', 'state']);
    $response->assertJson(['success' => true]);
    expect($response->json('auth_url'))->toContain('facebook.com');
});
