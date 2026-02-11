<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createPermAdmin(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    return $user;
}

test('super admin can access permissions management page', function () {
    $admin = createPermAdmin();
    Permission::create(['name' => 'view_users', 'guard_name' => 'web']);

    $response = $this->actingAs($admin)->get('/settings/management/permissions');

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('settings/management/permissions/index')
        ->has('roles')
        ->has('permissions')
    );
});

test('non super admin cannot access permissions management page', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/settings/management/permissions');

    $response->assertRedirect();
});

test('super admin can create a permission', function () {
    $admin = createPermAdmin();

    $response = $this->actingAs($admin)->post('/api/permissions', [
        'name' => 'new_permission',
    ]);

    $response->assertCreated();
    expect(Permission::where('name', 'new_permission')->exists())->toBeTrue();
});

test('cannot create duplicate permission', function () {
    $admin = createPermAdmin();
    Permission::create(['name' => 'existing_permission', 'guard_name' => 'web']);

    $response = $this->actingAs($admin)->post('/api/permissions', [
        'name' => 'existing_permission',
    ]);

    $response->assertSessionHasErrors('name');
});

test('super admin can bulk update permissions', function () {
    $admin = createPermAdmin();
    $role = Role::create(['name' => 'editor', 'guard_name' => 'web']);
    $perm1 = Permission::create(['name' => 'edit_posts', 'guard_name' => 'web']);
    $perm2 = Permission::create(['name' => 'delete_posts', 'guard_name' => 'web']);

    $response = $this->actingAs($admin)->postJson('/api/permissions/bulk-update', [
        'role_permissions' => [
            [
                'role_id' => $role->id,
                'permission_ids' => [$perm1->id, $perm2->id],
            ],
        ],
    ]);

    $response->assertOk();
    expect($role->fresh()->permissions)->toHaveCount(2);
});

test('non super admin cannot bulk update permissions', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/permissions/bulk-update', [
        'role_permissions' => [],
    ]);

    $response->assertForbidden();
});

test('non super admin cannot create a permission', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/permissions', [
        'name' => 'unauthorized_permission',
    ]);

    $response->assertForbidden();
});
