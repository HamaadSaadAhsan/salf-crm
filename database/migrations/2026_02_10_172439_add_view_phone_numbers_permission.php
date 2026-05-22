<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permission = Permission::firstOrCreate(['name' => 'view phone numbers']);

        // Only assign to roles if they already exist (fresh installs use the seeder instead)
        $admin = Role::where('name', 'admin')->first();
        $admin?->givePermissionTo($permission);

        $superAdmin = Role::where('name', 'super-admin')->first();
        $superAdmin?->givePermissionTo($permission);

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permission = Permission::where('name', 'view phone numbers')->first();
        $permission?->delete();

        app()[PermissionRegistrar::class]->forgetCachedPermissions();
    }
};
