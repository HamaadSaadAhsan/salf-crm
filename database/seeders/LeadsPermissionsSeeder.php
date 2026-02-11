<?php

// database/seeders/LeadsPermissionsSeeder.php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class LeadsPermissionsSeeder extends Seeder
{
    public function run()
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ===============================
        // LEADS PERMISSIONS
        // ===============================
        $leadPermissions = [
            // Basic CRUD operations
            'view leads',
            'create leads',
            'edit leads',
            'delete leads',

            // Lead status management
            'qualify leads',
            'disqualify leads',
            'convert leads',
            'reject leads',
            'reactivate leads',

            // Assignment permissions
            'assign leads',
            'unassign leads',
            'assign leads to self',
            'assign leads to others',
            'view assigned leads',
            'view all leads',
            'view team leads',

            // Lead scoring and qualification
            'score leads',
            'change lead score',
            'view lead score history',
            'set lead temperature',

            // Lead sources and campaigns
            'manage lead sources',
            'view lead source analytics',
            'manage campaigns',
            'view campaign performance',

            // Lead nurturing
            'add lead notes',
            'view lead notes',
            'schedule lead follow-ups',
            'view lead timeline',
            'send lead emails',
            'make lead calls',

            // Advanced lead operations
            'merge leads',
            'split leads',
            'export leads',
            'bulk edit leads',
            'import leads',

            // Lead analytics and reporting
            'view lead analytics',
            'view lead reports',
            'view lead conversion rates',
            'view lead pipeline',

            // Lead segments and tags
            'manage lead tags',
            'manage lead segments',
            'view lead demographics',
        ];

        // ===============================
        // SHARED/GENERAL PERMISSIONS
        // ===============================
        $generalPermissions = [
            // Dashboard and analytics
            'view dashboard',
            'view analytics',
            'view reports',
            'export data',

            // User and team management
            'view users',
            'create users',
            'edit users',
            'delete users',
            'manage teams',
            'view team performance',

            // System administration
            'access admin panel',
            'manage settings',
            'manage system configs',
            'view system logs',
            'manage integrations',

            // Communication
            'send emails',
            'send sms',
            'make calls',
            'schedule meetings',

            // File management
            'upload files',
            'delete files',
            'view files',
            'manage file permissions',

            // API and automation
            'access api',
            'manage webhooks',
            'manage automations',
            'view api logs',
        ];

        // Combine all permissions
        $allPermissions = array_merge($leadPermissions, $generalPermissions);

        // Create permissions
        foreach ($allPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // ===============================
        // CREATE ROLES AND ASSIGN PERMISSIONS
        // ===============================

        // 1. SALES REPRESENTATIVE ROLE
        $salesRep = Role::firstOrCreate(['name' => 'sales-rep']);
        $salesRep->syncPermissions([
            // Lead permissions
            'view leads',
            'create leads',
            'edit leads',
            'view assigned leads',
            'assign leads to self',
            'qualify leads',
            'disqualify leads',
            'convert leads',
            'score leads',
            'change lead score',
            'set lead temperature',
            'add lead notes',
            'view lead notes',
            'schedule lead follow-ups',
            'view lead timeline',
            'send lead emails',
            'make lead calls',
            'view lead pipeline',

            // General permissions
            'view dashboard',
            'view analytics',
            'upload files',
            'view files',
            'send emails',
            'send sms',
            'make calls',
            'schedule meetings',
        ]);

        // 2. SENIOR SALES REPRESENTATIVE ROLE
        $seniorSalesRep = Role::firstOrCreate(['name' => 'senior-sales-rep']);
        $seniorSalesRep->syncPermissions(array_merge($salesRep->permissions->pluck('name')->toArray(), [
            'view all leads',
            'assign leads to others',
            'view team leads',
            'merge leads',
            'split leads',
            'bulk edit leads',
            'export leads',
            'view lead analytics',
            'view lead reports',
            'view lead conversion rates',
            'manage lead tags',
            'manage lead segments',
        ]));

        // 3. TEAM LEAD/SUPERVISOR ROLE
        $teamLead = Role::firstOrCreate(['name' => 'team-lead']);
        $teamLead->syncPermissions([
            // All lead permissions
            'view leads',
            'create leads',
            'edit leads',
            'delete leads',
            'view all leads',
            'assign leads',
            'unassign leads',
            'assign leads to others',
            'view team leads',
            'qualify leads',
            'disqualify leads',
            'convert leads',
            'score leads',
            'change lead score',
            'set lead temperature',
            'merge leads',
            'split leads',
            'bulk edit leads',
            'export leads',
            'view lead analytics',
            'view lead reports',

            // Team management
            'view team performance',
            'view reports',
            'export data',

            // General permissions
            'view dashboard',
            'view analytics',
            'upload files',
            'view files',
            'send emails',
            'send sms',
            'make calls',
            'schedule meetings',
        ]);

        // 4. MANAGER ROLE
        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->syncPermissions(array_merge($teamLead->permissions->pluck('name')->toArray(), [
            // Advanced lead management
            'import leads',
            'manage lead sources',
            'view lead source analytics',
            'manage campaigns',
            'view campaign performance',
            'manage lead tags',
            'manage lead segments',
            'view lead demographics',

            // User management
            'view users',
            'create users',
            'edit users',
            'manage teams',

            // System access
            'view reports',
            'export data',
            'manage settings',
            'manage integrations',
            'access api',
            'manage webhooks',
        ]));

        // 5. ADMIN ROLE
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions(Permission::all());

        // 6. SUPER ADMIN ROLE
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions(Permission::all());

        $this->command->info('Created '.count($allPermissions).' permissions');
        $this->command->info('Created 6 roles with appropriate permissions');
    }
}
