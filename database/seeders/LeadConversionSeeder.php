<?php

namespace Database\Seeders;

use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class LeadConversionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure roles exist
        $supportAgentRole = Role::firstOrCreate(['name' => 'support-agent']);
        $seniorSupportAgentRole = Role::firstOrCreate(['name' => 'senior-support-agent']);
        $salesRepRole = Role::firstOrCreate(['name' => 'sales-rep']);

        // Create Lead Sources if they don't exist
        $leadSources = [];
        $sourceNames = [
            'Facebook Ads',
            'Google Ads',
            'Website Contact Form',
            'Referral',
            'Email Campaign',
            'LinkedIn',
            'Trade Show',
            'Cold Call',
        ];

        foreach ($sourceNames as $sourceName) {
            $leadSources[] = LeadSource::firstOrCreate(
                ['name' => $sourceName],
                ['status' => 'active']
            );
        }

        // Create Services if they don't exist
        $services = [];
        $serviceNames = [
            'Business Consulting',
            'Digital Marketing',
            'Financial Advisory',
            'IT Solutions',
            'Legal Services',
            'Real Estate',
        ];

        foreach ($serviceNames as $serviceName) {
            $services[] = Service::firstOrCreate(
                ['name' => $serviceName],
                [
                    'detail' => "{$serviceName} services",
                    'status' => 'active',
                    'sort_order' => 0,
                ]
            );
        }

        // Create 5 CROs with varying performance metrics
        $cros = [];
        $croData = [
            ['name' => 'Sarah Johnson', 'email' => 'sarah.johnson@example.com', 'conversion_rate' => 18.5, 'performance_weight' => 1.3, 'current_lead_count' => 12, 'total_leads_assigned' => 85, 'qualified_leads_count' => 45, 'role' => 'senior-support-agent'],
            ['name' => 'Michael Chen', 'email' => 'michael.chen@example.com', 'conversion_rate' => 22.0, 'performance_weight' => 1.3, 'current_lead_count' => 8, 'total_leads_assigned' => 120, 'qualified_leads_count' => 68, 'role' => 'senior-support-agent'],
            ['name' => 'Emily Rodriguez', 'email' => 'emily.rodriguez@example.com', 'conversion_rate' => 15.2, 'performance_weight' => 1.0, 'current_lead_count' => 15, 'total_leads_assigned' => 92, 'qualified_leads_count' => 38, 'role' => 'support-agent'],
            ['name' => 'David Kim', 'email' => 'david.kim@example.com', 'conversion_rate' => 19.8, 'performance_weight' => 1.3, 'current_lead_count' => 10, 'total_leads_assigned' => 105, 'qualified_leads_count' => 52, 'role' => 'support-agent'],
            ['name' => 'Jessica Thompson', 'email' => 'jessica.thompson@example.com', 'conversion_rate' => 16.5, 'performance_weight' => 1.1, 'current_lead_count' => 14, 'total_leads_assigned' => 78, 'qualified_leads_count' => 41, 'role' => 'support-agent'],
        ];

        foreach ($croData as $data) {
            $role = $data['role'];
            unset($data['role']);

            $cro = User::firstOrCreate(
                ['email' => $data['email']],
                array_merge($data, [
                    'available' => true,
                    'active' => true,
                    'converted_leads_count' => 0,
                    'password' => bcrypt('password'),
                ])
            );

            if (! $cro->hasRole($role)) {
                $cro->assignRole($role);
            }

            $cros[] = $cro;
        }

        // Create 5 Advisors with conversion statistics
        $advisors = [];
        $advisorData = [
            ['name' => 'Robert Martinez', 'email' => 'robert.martinez@example.com', 'conversion_rate' => 32.5, 'performance_weight' => 1.5, 'current_lead_count' => 8, 'total_leads_assigned' => 65, 'converted_leads_count' => 21, 'qualified_leads_count' => 0],
            ['name' => 'Amanda Lee', 'email' => 'amanda.lee@example.com', 'conversion_rate' => 28.0, 'performance_weight' => 1.3, 'current_lead_count' => 12, 'total_leads_assigned' => 89, 'converted_leads_count' => 25, 'qualified_leads_count' => 0],
            ['name' => 'Christopher Brown', 'email' => 'christopher.brown@example.com', 'conversion_rate' => 35.8, 'performance_weight' => 1.5, 'current_lead_count' => 6, 'total_leads_assigned' => 95, 'converted_leads_count' => 34, 'qualified_leads_count' => 0],
            ['name' => 'Michelle Davis', 'email' => 'michelle.davis@example.com', 'conversion_rate' => 25.5, 'performance_weight' => 1.3, 'current_lead_count' => 10, 'total_leads_assigned' => 72, 'converted_leads_count' => 18, 'qualified_leads_count' => 0],
            ['name' => 'Daniel Wilson', 'email' => 'daniel.wilson@example.com', 'conversion_rate' => 30.2, 'performance_weight' => 1.5, 'current_lead_count' => 9, 'total_leads_assigned' => 81, 'converted_leads_count' => 24, 'qualified_leads_count' => 0],
        ];

        foreach ($advisorData as $data) {
            $advisor = User::firstOrCreate(
                ['email' => $data['email']],
                array_merge($data, [
                    'available' => true,
                    'active' => true,
                    'password' => bcrypt('password'),
                ])
            );

            if (! $advisor->hasRole('sales-rep')) {
                $advisor->assignRole($salesRepRole);
            }

            $advisors[] = $advisor;
        }

        // Assign service specializations to advisors (2-3 services each)
        foreach ($advisors as $index => $advisor) {
            $servicesToAssign = array_slice($services, $index % count($services), 2 + ($index % 2));
            foreach ($servicesToAssign as $service) {
                if (! $advisor->services()->where('service_id', $service->id)->exists()) {
                    $advisor->services()->attach($service->id, ['status' => 'active']);
                }
            }
        }

        // Create leads at various stages
        // 10 new leads
        foreach (range(1, 10) as $i) {
            Lead::factory()->create([
                'inquiry_status' => 'new',
                'assigned_to' => null,
                'service_id' => $services[array_rand($services)]->id,
                'lead_source_id' => $leadSources[array_rand($leadSources)]->id,
                'priority' => ['low', 'medium', 'high', 'urgent'][array_rand(['low', 'medium', 'high', 'urgent'])],
            ]);
        }

        // 3-5 leads per CRO assigned to them (assigned_to_cro status)
        foreach ($cros as $cro) {
            $count = rand(3, 5);
            foreach (range(1, $count) as $i) {
                Lead::factory()->create([
                    'inquiry_status' => 'assigned_to_cro',
                    'assigned_to' => $cro->id,
                    'assigned_date' => now()->subDays(rand(1, 5)),
                    'service_id' => $services[array_rand($services)]->id,
                    'lead_source_id' => $leadSources[array_rand($leadSources)]->id,
                    'priority' => ['low', 'medium', 'high', 'urgent'][array_rand(['low', 'medium', 'high', 'urgent'])],
                ]);
            }
        }

        // 2-3 qualified leads waiting for advisor assignment
        foreach (range(1, rand(2, 3)) as $i) {
            $cro = $cros[array_rand($cros)];
            Lead::factory()->create([
                'inquiry_status' => 'qualified',
                'assigned_to' => $cro->id,
                'assigned_date' => now()->subDays(rand(1, 3)),
                'qualified_by' => $cro->id,
                'qualified_at' => now()->subDays(rand(1, 2)),
                'service_id' => $services[array_rand($services)]->id,
                'lead_source_id' => $leadSources[array_rand($leadSources)]->id,
                'priority' => ['high', 'urgent'][array_rand(['high', 'urgent'])],
            ]);
        }

        // 2-4 leads per advisor (assigned_to_advisor status)
        foreach ($advisors as $advisor) {
            $count = rand(2, 4);
            foreach (range(1, $count) as $i) {
                $cro = $cros[array_rand($cros)];
                Lead::factory()->create([
                    'inquiry_status' => 'assigned_to_advisor',
                    'assigned_to' => $advisor->id,
                    'assigned_date' => now()->subDays(rand(1, 7)),
                    'qualified_by' => $cro->id,
                    'qualified_at' => now()->subDays(rand(2, 8)),
                    'service_id' => $services[array_rand($services)]->id,
                    'lead_source_id' => $leadSources[array_rand($leadSources)]->id,
                    'priority' => ['high', 'urgent'][array_rand(['high', 'urgent'])],
                ]);
            }
        }

        // 2-4 converted leads per advisor
        foreach ($advisors as $advisor) {
            $count = rand(2, 4);
            foreach (range(1, $count) as $i) {
                $cro = $cros[array_rand($cros)];
                Lead::factory()->create([
                    'inquiry_status' => 'converted',
                    'assigned_to' => $advisor->id,
                    'assigned_date' => now()->subDays(rand(10, 30)),
                    'qualified_by' => $cro->id,
                    'qualified_at' => now()->subDays(rand(11, 31)),
                    'converted_at' => now()->subDays(rand(1, 10)),
                    'service_id' => $services[array_rand($services)]->id,
                    'lead_source_id' => $leadSources[array_rand($leadSources)]->id,
                    'priority' => ['high', 'urgent'][array_rand(['high', 'urgent'])],
                ]);
            }
        }

        // 1-2 lost leads per advisor
        foreach ($advisors as $advisor) {
            $count = rand(1, 2);
            foreach (range(1, $count) as $i) {
                $cro = $cros[array_rand($cros)];
                Lead::factory()->create([
                    'inquiry_status' => 'lost',
                    'assigned_to' => $advisor->id,
                    'assigned_date' => now()->subDays(rand(5, 20)),
                    'qualified_by' => $cro->id,
                    'qualified_at' => now()->subDays(rand(6, 21)),
                    'loss_reason' => ['Price too high', 'Went with competitor', 'Not ready', 'Budget constraints'][array_rand(['Price too high', 'Went with competitor', 'Not ready', 'Budget constraints'])],
                    'service_id' => $services[array_rand($services)]->id,
                    'lead_source_id' => $leadSources[array_rand($leadSources)]->id,
                    'priority' => ['low', 'medium', 'high'][array_rand(['low', 'medium', 'high'])],
                ]);
            }
        }

        // 1-2 unqualified leads per CRO
        foreach ($cros as $cro) {
            $count = rand(1, 2);
            foreach (range(1, $count) as $i) {
                Lead::factory()->create([
                    'inquiry_status' => 'unqualified',
                    'assigned_to' => $cro->id,
                    'assigned_date' => now()->subDays(rand(3, 15)),
                    'loss_reason' => ['Not a fit', 'Outside service area', 'Spam inquiry', 'Budget too low'][array_rand(['Not a fit', 'Outside service area', 'Spam inquiry', 'Budget too low'])],
                    'service_id' => $services[array_rand($services)]->id,
                    'lead_source_id' => $leadSources[array_rand($leadSources)]->id,
                    'priority' => 'low',
                ]);
            }
        }

        // 1-2 leads needing requalification
        foreach (range(1, rand(1, 2)) as $i) {
            $cro = $cros[array_rand($cros)];
            $advisor = $advisors[array_rand($advisors)];
            Lead::factory()->create([
                'inquiry_status' => 'requalify',
                'assigned_to' => $cro->id,
                'assigned_date' => now()->subDays(rand(1, 5)),
                'qualified_by' => $cro->id,
                'qualified_at' => now()->subDays(rand(5, 10)),
                'requalify_reason' => ['Needs more information', 'Changed requirements', 'Budget needs review', 'Timeline unclear'][array_rand(['Needs more information', 'Changed requirements', 'Budget needs review', 'Timeline unclear'])],
                'service_id' => $services[array_rand($services)]->id,
                'lead_source_id' => $leadSources[array_rand($leadSources)]->id,
                'priority' => ['medium', 'high'][array_rand(['medium', 'high'])],
            ]);
        }

        $this->command->info('Lead conversion seeding completed successfully!');
        $this->command->info('Created '.count($cros).' CROs and '.count($advisors).' Advisors');
        $this->command->info('Created leads at various conversion stages');
    }
}
