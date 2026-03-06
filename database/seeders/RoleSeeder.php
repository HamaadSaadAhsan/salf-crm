<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        $roles = [
            'customer',
            'support-agent',
            'senior-support-agent',
            'sales-rep',
            'senior-sales-rep',
            'team-lead',
            'manager',
            'admin',
            'super-admin',
            'processing',
            'fdo',
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }

        $this->command->info('Created '.count($roles).' roles.');
    }
}
