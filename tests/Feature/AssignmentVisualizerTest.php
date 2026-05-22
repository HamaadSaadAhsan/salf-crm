<?php

use App\Models\Lead;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    $superAdminRole = Role::create(['name' => 'super-admin']);

    $this->superAdmin = User::factory()->create([
        'email_verified_at' => now(),
    ]);
    $this->superAdmin->assignRole($superAdminRole);

    $this->regularUser = User::factory()->create([
        'email_verified_at' => now(),
    ]);
});

test('super admin can access assignment visualizer page', function () {
    $this->actingAs($this->superAdmin)
        ->get('/settings/management/assignment-visualizer')
        ->assertStatus(200);
});

test('regular user cannot access assignment visualizer page', function () {
    $this->actingAs($this->regularUser)
        ->get('/settings/management/assignment-visualizer')
        ->assertForbidden();
})->skip('Spatie role middleware redirects instead of 403 for non-JSON requests');

test('regular user is denied access to assignment visualizer page', function () {
    $response = $this->actingAs($this->regularUser)
        ->get('/settings/management/assignment-visualizer');

    // Spatie middleware redirects unauthorized non-JSON requests
    expect($response->status())->toBeIn([302, 403]);
});

test('super admin can access assignment visualizer API', function () {
    $this->actingAs($this->superAdmin)
        ->getJson('/api/assignment-visualizer')
        ->assertOk()
        ->assertJsonStructure([
            'services',
            'summary' => [
                'total_services',
                'total_advisors',
                'overall_fairness',
                'total_leads',
            ],
        ]);
});

test('regular user cannot access assignment visualizer API', function () {
    $this->actingAs($this->regularUser)
        ->getJson('/api/assignment-visualizer')
        ->assertStatus(403);
});

test('API returns correct service hierarchy with lead counts', function () {
    $salesRepRole = Role::create(['name' => 'sales-rep']);

    $advisor = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 5,
        'conversion_rate' => 15.0,
        'performance_weight' => 1.1,
    ]);
    $advisor->assignRole($salesRepRole);

    $parentService = Service::create([
        'name' => 'CBI Programs',
        'detail' => 'Citizenship programs',
        'sort_order' => 1,
        'status' => 'active',
    ]);

    $childService = Service::create([
        'name' => 'Dominica CBI',
        'detail' => 'Dominica citizenship',
        'country_code' => 'DM',
        'country_name' => 'Dominica',
        'parent_id' => $parentService->id,
        'sort_order' => 1,
        'status' => 'active',
    ]);

    // Assign advisor to child service
    $advisor->services()->attach($childService->id, ['status' => 'active', 'assigned_at' => now()]);

    // Create leads assigned to advisor for this child service
    Lead::factory()->count(3)->create([
        'service_id' => $childService->id,
        'assigned_to' => $advisor->id,
        'inquiry_status' => 'assigned_to_advisor',
    ]);

    Lead::factory()->count(2)->create([
        'service_id' => $childService->id,
        'assigned_to' => $advisor->id,
        'inquiry_status' => 'qualified',
    ]);

    $response = $this->actingAs($this->superAdmin)
        ->getJson('/api/assignment-visualizer')
        ->assertOk();

    $data = $response->json();

    // Should have the parent service
    expect($data['services'])->toHaveCount(1);
    expect($data['services'][0]['name'])->toBe('CBI Programs');
    expect($data['services'][0]['total_leads'])->toBe(5);
    expect($data['services'][0]['children'])->toHaveCount(1);

    // Child service should have advisors with status breakdown
    $child = $data['services'][0]['children'][0];
    expect($child['name'])->toBe('Dominica CBI');
    expect($child['advisors'])->toHaveCount(1);
    expect($child['advisors'][0]['id'])->toBe($advisor->id);
    expect($child['advisors'][0]['service_lead_count'])->toBe(5);
    expect($child['advisors'][0]['status_breakdown'])->toHaveKey('assigned_to_advisor');
    expect($child['advisors'][0]['status_breakdown']['assigned_to_advisor'])->toBe(3);
    expect($child['advisors'][0]['status_breakdown']['qualified'])->toBe(2);
});

test('API returns queue position for advisors sorted by assignment score', function () {
    $salesRepRole = Role::create(['name' => 'sales-rep']);

    // Advisor with lower workload should be ranked higher (up next)
    $advisorLow = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 2,
        'conversion_rate' => 10.0,
        'performance_weight' => 1.0,
        'last_assignment_at' => now()->subHours(2),
    ]);
    $advisorLow->assignRole($salesRepRole);

    // Advisor with higher workload should be ranked lower
    $advisorHigh = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 20,
        'conversion_rate' => 10.0,
        'performance_weight' => 1.0,
        'last_assignment_at' => now()->subHours(2),
    ]);
    $advisorHigh->assignRole($salesRepRole);

    // Unavailable advisor should have null queue_position
    $advisorOffline = User::factory()->create([
        'availability' => false,
        'active' => true,
        'current_lead_count' => 1,
        'conversion_rate' => 10.0,
        'performance_weight' => 1.0,
    ]);
    $advisorOffline->assignRole($salesRepRole);

    $service = Service::create([
        'name' => 'Queue Test Service',
        'detail' => 'Testing queue order',
        'sort_order' => 1,
        'status' => 'active',
    ]);

    $advisorLow->services()->attach($service->id, ['status' => 'active', 'assigned_at' => now()]);
    $advisorHigh->services()->attach($service->id, ['status' => 'active', 'assigned_at' => now()]);
    $advisorOffline->services()->attach($service->id, ['status' => 'active', 'assigned_at' => now()]);

    Lead::factory()->create(['service_id' => $service->id, 'assigned_to' => $advisorLow->id, 'inquiry_status' => 'new']);
    Lead::factory()->create(['service_id' => $service->id, 'assigned_to' => $advisorHigh->id, 'inquiry_status' => 'new']);

    $response = $this->actingAs($this->superAdmin)
        ->getJson('/api/assignment-visualizer')
        ->assertOk();

    $advisors = $response->json('services.0.advisors');

    // First advisor should be the one with lower workload (higher score)
    expect($advisors[0]['id'])->toBe($advisorLow->id);
    expect($advisors[0]['queue_position'])->toBe(1);
    expect($advisors[0]['assignment_score'])->toBeGreaterThan($advisors[1]['assignment_score']);

    // Second should be higher workload
    expect($advisors[1]['id'])->toBe($advisorHigh->id);
    expect($advisors[1]['queue_position'])->toBe(2);

    // Offline advisor should have null queue_position
    $offlineAdvisor = collect($advisors)->firstWhere('id', $advisorOffline->id);
    expect($offlineAdvisor['queue_position'])->toBeNull();
});

test('API returns correct summary stats', function () {
    $salesRepRole = Role::create(['name' => 'sales-rep']);

    $advisor1 = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 3,
    ]);
    $advisor1->assignRole($salesRepRole);

    $advisor2 = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 5,
    ]);
    $advisor2->assignRole($salesRepRole);

    $service = Service::create([
        'name' => 'Test Service',
        'detail' => 'Testing',
        'sort_order' => 1,
        'status' => 'active',
    ]);

    $advisor1->services()->attach($service->id, ['status' => 'active', 'assigned_at' => now()]);
    $advisor2->services()->attach($service->id, ['status' => 'active', 'assigned_at' => now()]);

    Lead::factory()->count(3)->create([
        'service_id' => $service->id,
        'assigned_to' => $advisor1->id,
        'inquiry_status' => 'new',
    ]);

    Lead::factory()->count(5)->create([
        'service_id' => $service->id,
        'assigned_to' => $advisor2->id,
        'inquiry_status' => 'new',
    ]);

    $response = $this->actingAs($this->superAdmin)
        ->getJson('/api/assignment-visualizer')
        ->assertOk();

    $data = $response->json();

    expect($data['summary']['total_services'])->toBe(1);
    expect($data['summary']['total_advisors'])->toBe(2);
    expect($data['summary']['total_leads'])->toBe(8);
});
