<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    // Create super-admin role if it doesn't exist
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
});

describe('User Show Page', function () {
    it('requires authentication', function () {
        $user = User::factory()->create();

        $response = $this->get("/users/{$user->id}");

        $response->assertRedirect('/login');
    });

    it('requires super-admin role', function () {
        $regularUser = User::factory()->create();
        $targetUser = User::factory()->create();

        $response = $this->actingAs($regularUser)->get("/users/{$targetUser->id}");

        $response->assertRedirect();
    });

    it('can be accessed by super-admin', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $targetUser = User::factory()->create();

        $response = $this->actingAs($superAdmin)->get("/users/{$targetUser->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('users/show')
            ->has('user')
            ->has('roles')
            ->has('zones')
            ->has('offices')
            ->has('services')
        );
    });

    it('returns correct user data', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $targetUser = User::factory()->create([
            'name' => 'Test User',
            'email' => 'testuser@example.com',
        ]);

        $response = $this->actingAs($superAdmin)->get("/users/{$targetUser->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('users/show')
            ->where('user.id', $targetUser->id)
            ->where('user.name', 'Test User')
            ->where('user.email', 'testuser@example.com')
        );
    });

    it('returns 404 for non-existent user', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $response = $this->actingAs($superAdmin)->get('/users/99999');

        $response->assertNotFound();
    });
});
