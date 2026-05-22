<?php

// database/seeders/LeadsPermissionsSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class LeadsPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // ===============================
        // LEAD PERMISSIONS
        // ===============================
        $leadPermissions = [
            // CRUD
            'view leads',
            'create leads',
            'edit leads',
            'delete leads',

            // Status transitions
            'qualify leads',
            'disqualify leads',
            'convert leads',
            'reactivate leads',

            // Assignment
            'view assigned leads',    // own assigned leads only
            'view team leads',        // leads belonging to team members
            'view all leads',         // all leads in the system
            'assign leads',           // bulk assignment tools
            'unassign leads',
            'assign leads to self',
            'assign leads to others',

            // Scoring & temperature
            'score leads',            // set/change a lead score
            'set lead temperature',

            // Nurturing & communication
            'add lead notes',
            'view lead notes',
            'schedule lead follow-ups',
            'view lead timeline',
            'send lead emails',
            'make lead calls',

            // Bulk & advanced operations
            'merge leads',
            'split leads',
            'bulk edit leads',
            'export leads',
            'import leads',

            // Analytics & reporting
            'view lead analytics',
            'view lead reports',
            'view lead pipeline',
            'view lead demographics',
            'view lead conversion rates',

            // Sources, campaigns, tags
            'manage lead sources',
            'view lead source analytics',
            'manage campaigns',
            'view campaign performance',
            'manage lead tags',
            'manage lead segments',
        ];

        // ===============================
        // GENERAL / SHARED PERMISSIONS
        // ===============================
        $generalPermissions = [
            // Dashboard & reporting
            'view dashboard',
            'view analytics',
            'view reports',
            'export data',

            // User & team management
            'view users',
            'create users',
            'edit users',
            'delete users',
            'manage teams',
            'view team performance',
            'manage team agents',       // senior roles: manage their subordinate agents

            // System administration (admin+ only)
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
            'view files',
            'delete files',
            'manage file permissions',

            // Document management
            'view documents',

            // API & automation (admin+ only)
            'access api',
            'manage webhooks',
            'manage automations',
            'view api logs',

            // Visibility
            'view phone numbers',

            // Tasks
            'view tasks',
            'create tasks',
            'edit tasks',
            'delete tasks',
        ];

        $allPermissions = array_merge($leadPermissions, $generalPermissions);

        foreach ($allPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // ===============================
        // ROLE PERMISSION ASSIGNMENTS
        // ===============================

        // 1. SALES REP — own leads only, basic operations
        $salesRep = Role::firstOrCreate(['name' => 'sales-rep']);
        $salesRep->syncPermissions([
            'view dashboard',
            'view analytics',
            'view leads',
            'edit leads',
            'view assigned leads',
            'assign leads to self',
            'qualify leads',
            'disqualify leads',
            'convert leads',
            'score leads',
            'set lead temperature',
            'add lead notes',
            'view lead notes',
            'schedule lead follow-ups',
            'view lead timeline',
            'send lead emails',
            'make lead calls',
            'view lead pipeline',
            'upload files',
            'view files',
            'send emails',
            'send sms',
            'make calls',
            'schedule meetings',
            'view tasks',
            'create tasks',
            'edit tasks',
        ]);

        // 2. SENIOR SALES REP — team visibility + reassignment + manage their sales-reps
        $seniorSalesRep = Role::firstOrCreate(['name' => 'senior-sales-rep']);
        $seniorSalesRep->syncPermissions(array_merge($salesRep->permissions->pluck('name')->toArray(), [
            'view all leads',
            'view team leads',
            'assign leads to others',
            'merge leads',
            'split leads',
            'bulk edit leads',
            'export leads',
            'view lead analytics',
            'view lead reports',
            'view lead conversion rates',
            'manage lead tags',
            'manage lead segments',
            'delete tasks',
            // Senior management
            'manage team agents',
            'view users',
        ]));

        // 3. SUPPORT AGENT — team-lead level, full lead management
        $supportAgent = Role::firstOrCreate(['name' => 'support-agent']);
        $supportAgent->syncPermissions([
            'view dashboard',
            'view analytics',
            'view reports',
            'export data',
            'view leads',
            'edit leads',
            'delete leads',
            'view assigned leads',
            'view team leads',
            'view all leads',
            'assign leads',
            'unassign leads',
            'assign leads to self',
            'assign leads to others',
            'qualify leads',
            'disqualify leads',
            'convert leads',
            'score leads',
            'set lead temperature',
            'merge leads',
            'split leads',
            'bulk edit leads',
            'export leads',
            'view lead analytics',
            'view lead reports',
            'view lead pipeline',
            'add lead notes',
            'view lead notes',
            'schedule lead follow-ups',
            'view lead timeline',
            'send lead emails',
            'make lead calls',
            'view team performance',
            'upload files',
            'view files',
            'send emails',
            'send sms',
            'make calls',
            'schedule meetings',
            'view phone numbers',
            'view tasks',
            'create tasks',
            'edit tasks',
        ]);

        // 4. SENIOR SUPPORT AGENT — manager level + manages support-agents
        $seniorSupportAgent = Role::firstOrCreate(['name' => 'senior-support-agent']);
        $seniorSupportAgent->syncPermissions(array_merge($supportAgent->permissions->pluck('name')->toArray(), [
            'import leads',
            'manage lead sources',
            'view lead source analytics',
            'manage campaigns',
            'view campaign performance',
            'manage lead tags',
            'manage lead segments',
            'view lead demographics',
            'view lead conversion rates',
            'manage teams',
            'delete tasks',
            // Senior management
            'manage team agents',
            'view users',
        ]));

        // 5. TEAM LEAD — full lead management + team oversight
        $teamLead = Role::firstOrCreate(['name' => 'team-lead']);
        $teamLead->syncPermissions([
            'view dashboard',
            'view analytics',
            'view reports',
            'export data',
            'view leads',
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
            'set lead temperature',
            'merge leads',
            'split leads',
            'bulk edit leads',
            'export leads',
            'view lead analytics',
            'view lead reports',
            'view lead pipeline',
            'view team performance',
            'upload files',
            'view files',
            'send emails',
            'send sms',
            'make calls',
            'schedule meetings',
            'view phone numbers',
            'view tasks',
            'create tasks',
            'edit tasks',
            'delete tasks',
        ]);

        // 6. MANAGER — team-lead + advanced lead ops + partial user management
        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->syncPermissions(array_merge($teamLead->permissions->pluck('name')->toArray(), [
            'import leads',
            'manage lead sources',
            'view lead source analytics',
            'manage campaigns',
            'view campaign performance',
            'manage lead tags',
            'manage lead segments',
            'view lead demographics',
            'view lead conversion rates',
            'view users',
            'create users',
            'edit users',
            'manage teams',
            'manage settings',
            'manage integrations',
            'access api',
            'manage webhooks',
        ]));

        // 7. ADMIN — all permissions
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions(Permission::all());

        // 8. SUPER ADMIN — all permissions
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions(Permission::all());

        // 9. PROCESSING — read-only access to leads at configured advisor stages
        $processing = Role::firstOrCreate(['name' => 'processing']);
        $processing->syncPermissions([
            'view dashboard',
            'view leads',
            'view lead notes',
            'view lead timeline',
            'view lead pipeline',
            'view files',
            'view tasks',
            'view documents',
        ]);

        // 10. FDO — can view dashboard, view leads, and create leads manually
        $fdo = Role::firstOrCreate(['name' => 'fdo']);
        $fdo->syncPermissions([
            'view dashboard',
            'view leads',
            'create leads',
        ]);

        $this->command->info('Created '.count($allPermissions).' permissions across 10 roles.');
    }
}
