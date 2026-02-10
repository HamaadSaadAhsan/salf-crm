<?php

use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    $this->superAdmin = User::factory()->create();
    $this->superAdmin->assignRole('super-admin');

    $this->targetUser = User::factory()->create();

    $this->permissions = collect(['leads.view', 'leads.create', 'users.view'])->map(
        fn (string $name) => Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web'])
    );
});

describe('User Direct Permissions', function () {
    it('shows allPermissions on user show page', function () {
        $response = $this->actingAs($this->superAdmin)
            ->get("/users/{$this->targetUser->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('users/show')
            ->has('allPermissions')
        );
    });

    it('shows direct_permissions in user data', function () {
        $this->targetUser->givePermissionTo('leads.view');

        $response = $this->actingAs($this->superAdmin)
            ->get("/users/{$this->targetUser->id}");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('users/show')
            ->has('user.direct_permissions', 1)
            ->where('user.direct_permissions.0.name', 'leads.view')
        );
    });

    it('can update direct permissions', function () {
        $permissionIds = $this->permissions->pluck('id')->toArray();

        $response = $this->actingAs($this->superAdmin)
            ->patchJson("/api/users/{$this->targetUser->id}/permissions", [
                'permission_ids' => $permissionIds,
            ]);

        $response->assertOk();
        $response->assertJson(['message' => 'Permissions updated successfully.']);

        $this->targetUser->refresh();
        expect($this->targetUser->getDirectPermissions())->toHaveCount(3);
    });

    it('can clear all direct permissions', function () {
        $this->targetUser->givePermissionTo(['leads.view', 'leads.create']);

        $response = $this->actingAs($this->superAdmin)
            ->patchJson("/api/users/{$this->targetUser->id}/permissions", [
                'permission_ids' => [],
            ]);

        $response->assertOk();

        $this->targetUser->refresh();
        expect($this->targetUser->getDirectPermissions())->toHaveCount(0);
    });

    it('validates permission_ids are valid', function () {
        $response = $this->actingAs($this->superAdmin)
            ->patchJson("/api/users/{$this->targetUser->id}/permissions", [
                'permission_ids' => [99999],
            ]);

        $response->assertUnprocessable();
    });

    it('requires super-admin role', function () {
        $regularUser = User::factory()->create();

        $response = $this->actingAs($regularUser)
            ->patchJson("/api/users/{$this->targetUser->id}/permissions", [
                'permission_ids' => [],
            ]);

        $response->assertForbidden();
    });

    it('requires authentication', function () {
        $response = $this->patchJson("/api/users/{$this->targetUser->id}/permissions", [
            'permission_ids' => [],
        ]);

        $response->assertUnauthorized();
    });
});
