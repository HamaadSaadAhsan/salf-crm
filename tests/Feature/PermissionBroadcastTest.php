<?php

use App\Events\RolePermissionsUpdated;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function createBroadcastAdmin(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    return $user;
}

test('event is dispatched when role permissions are updated', function () {
    Event::fake([RolePermissionsUpdated::class]);

    $admin = createBroadcastAdmin();
    $role = Role::create(['name' => 'test-role', 'guard_name' => 'web']);
    $permission = Permission::create(['name' => 'test_perm', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('test-role');

    $this->actingAs($admin)->put("/api/roles/{$role->id}", [
        'name' => 'test-role',
        'permissions' => [$permission->id],
    ]);

    Event::assertDispatched(RolePermissionsUpdated::class, function ($event) use ($user, $role) {
        return $event->roleName === $role->name
            && in_array($user->id, $event->userIds);
    });
});

test('event is dispatched when permissions are bulk updated', function () {
    Event::fake([RolePermissionsUpdated::class]);

    $admin = createBroadcastAdmin();
    $role = Role::create(['name' => 'broadcast-role', 'guard_name' => 'web']);
    $permission = Permission::create(['name' => 'broadcast_perm', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('broadcast-role');

    $this->actingAs($admin)->post('/api/permissions/bulk-update', [
        'role_permissions' => [
            [
                'role_id' => $role->id,
                'permission_ids' => [$permission->id],
            ],
        ],
    ]);

    Event::assertDispatched(RolePermissionsUpdated::class, function ($event) use ($user) {
        return in_array($user->id, $event->userIds);
    });
});

test('event is not dispatched when role has no users', function () {
    Event::fake([RolePermissionsUpdated::class]);

    $admin = createBroadcastAdmin();
    $role = Role::create(['name' => 'empty-role', 'guard_name' => 'web']);
    $permission = Permission::create(['name' => 'empty_perm', 'guard_name' => 'web']);

    $this->actingAs($admin)->put("/api/roles/{$role->id}", [
        'name' => 'empty-role',
        'permissions' => [$permission->id],
    ]);

    Event::assertNotDispatched(RolePermissionsUpdated::class);
});

test('event broadcasts to correct private channels', function () {
    $user1 = User::factory()->create();
    $user2 = User::factory()->create();

    $event = new RolePermissionsUpdated('test-role', [$user1->id, $user2->id]);

    $channels = $event->broadcastOn();

    expect($channels)->toHaveCount(2);
    expect($channels[0]->name)->toBe("private-user.{$user1->id}");
    expect($channels[1]->name)->toBe("private-user.{$user2->id}");
});

test('event broadcasts correct data', function () {
    $event = new RolePermissionsUpdated('admin', [1, 2]);

    $data = $event->broadcastWith();

    expect($data)->toHaveKey('role_name', 'admin');
    expect($data)->toHaveKey('timestamp');
    expect($event->broadcastAs())->toBe('permissions.updated');
});
