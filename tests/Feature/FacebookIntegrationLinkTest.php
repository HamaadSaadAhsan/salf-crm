<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

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

it('shows facebook as connected when user has a valid oauth token', function () {
    $this->user->update([
        'facebook_user_access_token' => encrypt('test-access-token'),
        'facebook_token_expires_at' => now()->addDays(60),
        'facebook_connected_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->get(route('integrations'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('integrations/index')
        ->where('statuses.facebook', true)
    );
});

it('shows facebook as disconnected when user oauth token is expired', function () {
    $this->user->update([
        'facebook_user_access_token' => encrypt('test-access-token'),
        'facebook_token_expires_at' => now()->subDay(),
        'facebook_connected_at' => now()->subDays(61),
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
