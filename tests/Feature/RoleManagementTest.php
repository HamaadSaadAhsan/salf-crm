<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createSuperAdmin(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    return $user;
}

test('super admin can access roles management page', function () {
    $admin = createSuperAdmin();

    $response = $this->actingAs($admin)->get('/settings/management/roles');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/management/roles/index')
        ->has('roles')
        ->has('permissions')
    );
});

test('non super admin cannot access roles management page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings/management/roles');

    $response->assertRedirect();
});

test('super admin can create a role', function () {
    $admin = createSuperAdmin();

    $response = $this->actingAs($admin)->post('/api/roles', [
        'name' => 'test-role',
    ]);

    $response->assertCreated();
    expect(Role::where('name', 'test-role')->exists())->toBeTrue();
});

test('super admin can create a role with permissions', function () {
    $admin = createSuperAdmin();
    $permission = Permission::create(['name' => 'test_permission', 'guard_name' => 'web']);

    $response = $this->actingAs($admin)->post('/api/roles', [
        'name' => 'test-role-with-perms',
        'permissions' => [$permission->id],
    ]);

    $response->assertCreated();
    $role = Role::where('name', 'test-role-with-perms')->first();
    expect($role->permissions)->toHaveCount(1);
});

test('super admin can update a role', function () {
    $admin = createSuperAdmin();
    $role = Role::create(['name' => 'old-name', 'guard_name' => 'web']);

    $response = $this->actingAs($admin)->put("/api/roles/{$role->id}", [
        'name' => 'new-name',
    ]);

    $response->assertOk();
    expect($role->fresh()->name)->toBe('new-name');
});

test('super admin can delete a role without users', function () {
    $admin = createSuperAdmin();
    $role = Role::create(['name' => 'deletable-role', 'guard_name' => 'web']);

    $response = $this->actingAs($admin)->delete("/api/roles/{$role->id}");

    $response->assertOk();
    expect(Role::where('name', 'deletable-role')->exists())->toBeFalse();
});

test('cannot delete a role with assigned users', function () {
    $admin = createSuperAdmin();
    $role = Role::create(['name' => 'busy-role', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('busy-role');

    $response = $this->actingAs($admin)->delete("/api/roles/{$role->id}");

    $response->assertUnprocessable();
    expect(Role::where('name', 'busy-role')->exists())->toBeTrue();
});

test('non super admin cannot create a role', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/roles', [
        'name' => 'unauthorized-role',
    ]);

    $response->assertForbidden();
});

test('non super admin cannot delete a role', function () {
    $user = User::factory()->create();
    $role = Role::create(['name' => 'protected-role', 'guard_name' => 'web']);

    $response = $this->actingAs($user)->deleteJson("/api/roles/{$role->id}");

    $response->assertForbidden();
});
