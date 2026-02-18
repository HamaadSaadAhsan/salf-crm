<?php

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'support-agent', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'senior-support-agent', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'sales-rep', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'senior-sales-rep', 'guard_name' => 'web']);
});

describe('CRO Performance Board', function () {
    it('returns cro metrics for support-agent user', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $cro = User::factory()->create([
            'current_lead_count' => 25,
        ]);
        $cro->assignRole('support-agent');

        // Create leads assigned to this CRO with first_cro_contact_at
        Lead::factory()->count(3)->create([
            'assigned_to' => $cro->id,
            'first_cro_contact_at' => now()->subMinutes(30),
            'qualified_by' => $cro->id,
            'qualified_at' => now(),
            'inquiry_status' => 'qualified',
        ]);

        // One contacted but not qualified
        Lead::factory()->create([
            'assigned_to' => $cro->id,
            'first_cro_contact_at' => now()->subHour(),
            'inquiry_status' => 'contacted',
        ]);

        // One won lead qualified by this CRO
        Lead::factory()->create([
            'qualified_by' => $cro->id,
            'qualified_at' => now()->subDays(5),
            'inquiry_status' => 'won',
        ]);

        $response = $this->actingAs($superAdmin)
            ->getJson("/api/users/{$cro->id}/performance-board");

        $response->assertOk()
            ->assertJson([
                'role_type' => 'cro',
            ])
            ->assertJsonStructure([
                'role_type',
                'metrics' => [
                    'qtc_ratio',
                    'capacity' => ['current', 'max', 'percentage'],
                    'requalification_score',
                    'lts_ratio',
                    'total_assigned',
                    'otc_open_ratio',
                    'otc_lost_ratio',
                    'pending_follow_ups',
                    'overdue_follow_ups',
                    'first_response_time',
                ],
            ]);

        $data = $response->json();
        expect($data['metrics']['capacity']['current'])->toBe(25);
        expect($data['metrics']['capacity']['max'])->toBe(50);
    });

    it('returns correct qtc ratio calculation', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $cro = User::factory()->create();
        $cro->assignRole('support-agent');

        // 2 contacted and qualified
        Lead::factory()->count(2)->create([
            'assigned_to' => $cro->id,
            'first_cro_contact_at' => now(),
            'qualified_by' => $cro->id,
            'qualified_at' => now(),
            'inquiry_status' => 'qualified',
        ]);

        // 2 contacted but not qualified
        Lead::factory()->count(2)->create([
            'assigned_to' => $cro->id,
            'first_cro_contact_at' => now(),
            'inquiry_status' => 'contacted',
        ]);

        $response = $this->actingAs($superAdmin)
            ->getJson("/api/users/{$cro->id}/performance-board");

        $data = $response->json();
        // 2 qualified / 4 contacted = 50%
        expect($data['metrics']['qtc_ratio'])->toEqual(50.0);
    });
});

describe('Advisor Performance Board', function () {
    it('returns advisor metrics for sales-rep user', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $advisor = User::factory()->create([
            'performance_weight' => 1.3,
        ]);
        $advisor->assignRole('sales-rep');

        // Won lead
        Lead::factory()->create([
            'assigned_to' => $advisor->id,
            'inquiry_status' => 'won',
            'converted_at' => now(),
            'qualified_at' => now()->subDays(5),
            'advisor_first_contact_at' => now()->subDays(4),
        ]);

        // Active lead
        Lead::factory()->create([
            'assigned_to' => $advisor->id,
            'inquiry_status' => 'proposal',
            'qualified_at' => now()->subDays(2),
            'advisor_first_contact_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($superAdmin)
            ->getJson("/api/users/{$advisor->id}/performance-board");

        $response->assertOk()
            ->assertJson([
                'role_type' => 'advisor',
            ])
            ->assertJsonStructure([
                'role_type',
                'metrics' => [
                    'performance_score',
                    'requalify_percentage',
                    'lts_ratio',
                    'total_assigned',
                    'otc_open_ratio',
                    'otc_lost_ratio',
                    'pending_follow_ups',
                    'overdue_follow_ups',
                    'first_response_time',
                    'avg_lifecycle_days',
                ],
            ]);

        $data = $response->json();
        expect($data['metrics']['performance_score'])->toBe(1.3);
        // 1 won / 2 total = 50%
        expect($data['metrics']['lts_ratio'])->toEqual(50.0);
    });

    it('returns correct requalify percentage', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $advisor = User::factory()->create();
        $advisor->assignRole('sales-rep');

        // 4 assigned leads
        Lead::factory()->count(3)->create([
            'assigned_to' => $advisor->id,
            'inquiry_status' => 'proposal',
        ]);

        // 1 requalified from this advisor
        Lead::factory()->create([
            'assigned_to' => $advisor->id,
            'requalified_from_advisor_id' => $advisor->id,
            'inquiry_status' => 'requalify',
        ]);

        $response = $this->actingAs($superAdmin)
            ->getJson("/api/users/{$advisor->id}/performance-board");

        $data = $response->json();
        // 1 requalified / 4 total = 25%
        expect($data['metrics']['requalify_percentage'])->toEqual(25.0);
    });
});

describe('Authorization', function () {
    it('allows super-admin to view any user performance board', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $cro = User::factory()->create();
        $cro->assignRole('support-agent');

        $response = $this->actingAs($superAdmin)
            ->getJson("/api/users/{$cro->id}/performance-board");

        $response->assertOk();
    });

    it('allows users to view their own performance board', function () {
        $cro = User::factory()->create();
        $cro->assignRole('support-agent');

        $response = $this->actingAs($cro)
            ->getJson("/api/users/{$cro->id}/performance-board");

        $response->assertOk();
    });

    it('denies non-admin users from viewing other users performance board', function () {
        $user = User::factory()->create();
        $user->assignRole('support-agent');

        $otherUser = User::factory()->create();
        $otherUser->assignRole('sales-rep');

        $response = $this->actingAs($user)
            ->getJson("/api/users/{$otherUser->id}/performance-board");

        $response->assertForbidden();
    });

    it('returns other role_type for non-CRO non-Advisor users', function () {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $response = $this->actingAs($superAdmin)
            ->getJson("/api/users/{$superAdmin->id}/performance-board");

        $response->assertOk()
            ->assertJson([
                'role_type' => 'other',
                'metrics' => [],
            ]);
    });
});
