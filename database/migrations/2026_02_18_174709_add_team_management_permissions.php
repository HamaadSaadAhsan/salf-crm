<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Create new permissions introduced in this migration
        $newPermissions = [
            'manage team agents',
            'view tasks',
            'create tasks',
            'edit tasks',
            'delete tasks',
        ];

        foreach ($newPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Remove redundant 'change lead score' (merged into 'score leads')
        $redundant = Permission::where('name', 'change lead score')->first();
        if ($redundant) {
            $redundant->delete();
        }

        // Grant task permissions to existing roles
        foreach (['team-lead', 'manager'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->givePermissionTo(['view tasks', 'create tasks', 'edit tasks', 'delete tasks']);
            }
        }

        // Grant senior management permissions to senior-sales-rep
        $seniorSalesRep = Role::where('name', 'senior-sales-rep')->first();
        if ($seniorSalesRep) {
            $seniorSalesRep->givePermissionTo(['manage team agents', 'view users']);
        }

        // Full permission sync for support-agent and senior-support-agent (were empty before)
        // Handled by re-running the seeder; migration just creates the missing permissions.

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Restore 'change lead score'
        Permission::firstOrCreate(['name' => 'change lead score']);

        // Remove added permissions
        $toRemove = ['manage team agents', 'view tasks', 'create tasks', 'edit tasks', 'delete tasks'];
        Permission::whereIn('name', $toRemove)->each(fn ($p) => $p->delete());

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
