<?php

// database/seeders/TicketsLeadsPermissionsSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class TicketsLeadsPermissionsSeeder extends Seeder
{
    public function run()
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // ===============================
        // TICKETS PERMISSIONS
        // ===============================
        $ticketPermissions = [
            // Basic CRUD operations
            'view tickets',
            'create tickets',
            'edit tickets',
            'delete tickets',

            // Ticket status management
            'open tickets',
            'close tickets',
            'resolve tickets',
            'reopen tickets',
            'escalate tickets',

            // Assignment permissions
            'assign tickets',
            'unassign tickets',
            'assign tickets to self',
            'assign tickets to others',
            'view assigned tickets',
            'view all tickets',
            'view team tickets',

            // Priority management
            'change ticket priority',
            'set high priority tickets',
            'set critical priority tickets',

            // Advanced ticket operations
            'merge tickets',
            'split tickets',
            'convert ticket to lead',
            'view ticket history',
            'view ticket analytics',
            'export tickets',
            'bulk edit tickets',
            'view internal ticket notes',
            'add internal ticket notes',

            // Ticket categories and types
            'manage ticket categories',
            'manage ticket types',
            'view ticket reports',

            // SLA and time tracking
            'view ticket sla',
            'manage ticket sla',
            'track ticket time',
            'view ticket time logs',

            // Customer interaction
            'reply to tickets',
            'view customer ticket history',
            'access ticket customer info',
        ];

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
            'convert lead to ticket',
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
        $allPermissions = array_merge($ticketPermissions, $leadPermissions, $generalPermissions);

        // Create permissions
        foreach ($allPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // ===============================
        // CREATE ROLES AND ASSIGN PERMISSIONS
        // ===============================

        // 1. CUSTOMER/CLIENT ROLE
        $customer = Role::firstOrCreate(['name' => 'customer']);
        $customer->syncPermissions([
            'create tickets',
            'view tickets', // Only their own tickets
            'reply to tickets', // Only their own tickets
            'view ticket history', // Only their own tickets
        ]);

        // 2. SUPPORT AGENT ROLE
        $supportAgent = Role::firstOrCreate(['name' => 'support-agent']);
        $supportAgent->syncPermissions([
            // Ticket permissions
            'view tickets',
            'create tickets',
            'edit tickets',
            'reply to tickets',
            'assign tickets to self',
            'view assigned tickets',
            'open tickets',
            'close tickets',
            'resolve tickets',
            'reopen tickets',
            'change ticket priority',
            'add internal ticket notes',
            'view internal ticket notes',
            'view ticket history',
            'track ticket time',
            'view ticket time logs',
            'access ticket customer info',
            'view customer ticket history',

            // Basic lead permissions
            'view leads',
            'create leads',
            'edit leads',
            'view assigned leads',
            'add lead notes',
            'view lead notes',
            'schedule lead follow-ups',
            'view lead timeline',
            'assign leads to self',

            // General permissions
            'view dashboard',
            'upload files',
            'view files',
            'send emails',
            'make calls',
        ]);

        // 3. SENIOR SUPPORT AGENT ROLE
        $seniorAgent = Role::firstOrCreate(['name' => 'senior-support-agent']);
        $seniorAgent->syncPermissions(array_merge($supportAgent->permissions->pluck('name')->toArray(), [
            'assign tickets to others',
            'view team tickets',
            'escalate tickets',
            'set high priority tickets',
            'merge tickets',
            'split tickets',
            'convert ticket to lead',
            'bulk edit tickets',
            'view ticket analytics',

            // Enhanced lead permissions
            'assign leads to others',
            'view team leads',
            'qualify leads',
            'disqualify leads',
            'score leads',
            'merge leads',
            'split leads',
        ]));

        // 4. SALES REPRESENTATIVE ROLE
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

            // Basic ticket permissions (for customer support)
            'view tickets',
            'create tickets',
            'reply to tickets',
            'view customer ticket history',

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

        // 5. SENIOR SALES REPRESENTATIVE ROLE
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
            'convert lead to ticket',
        ]));

        // 6. TEAM LEAD/SUPERVISOR ROLE
        $teamLead = Role::firstOrCreate(['name' => 'team-lead']);
        $teamLead->syncPermissions([
            // All agent permissions
            'view tickets',
            'create tickets',
            'edit tickets',
            'delete tickets',
            'assign tickets',
            'unassign tickets',
            'assign tickets to others',
            'view all tickets',
            'view team tickets',
            'open tickets',
            'close tickets',
            'resolve tickets',
            'reopen tickets',
            'escalate tickets',
            'change ticket priority',
            'set high priority tickets',
            'merge tickets',
            'split tickets',
            'convert ticket to lead',
            'view ticket history',
            'view ticket analytics',
            'bulk edit tickets',
            'view internal ticket notes',
            'add internal ticket notes',
            'track ticket time',
            'view ticket time logs',

            // All sales permissions
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
            'convert lead to ticket',

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

        // 7. MANAGER ROLE
        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->syncPermissions(array_merge($teamLead->permissions->pluck('name')->toArray(), [
            // Advanced ticket management
            'set critical priority tickets',
            'manage ticket categories',
            'manage ticket types',
            'view ticket reports',
            'manage ticket sla',
            'view ticket sla',
            'export tickets',

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

        // 8. ADMIN ROLE
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions(Permission::all());

        // 9. SUPER ADMIN ROLE
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions(Permission::all());

        $this->command->info('✅ Created ' . count($allPermissions) . ' permissions');
        $this->command->info('✅ Created 9 roles with appropriate permissions');
    }
}
