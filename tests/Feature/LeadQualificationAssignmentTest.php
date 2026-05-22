<?php

use App\Events\LeadQualified;
use App\Models\City;
use App\Models\Lead;
use App\Models\Service;
use App\Models\User;
use App\Models\Zone;
use App\Services\LeadAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Disable broadcasting to avoid Pusher/Reverb connection errors in tests
    config(['broadcasting.default' => 'null']);

    $this->assignmentService = app(LeadAssignmentService::class);

    // Create roles
    $supportAgentRole = Role::create(['name' => 'support-agent']);
    $salesRepRole = Role::create(['name' => 'sales-rep']);

    // Create city, zone, and service for strict matching
    $this->city = City::factory()->create(['name' => 'Dubai']);
    $this->zone = Zone::factory()->create(['name' => 'UAE Zone']);
    $this->zone->cities()->attach($this->city);
    $this->service = Service::create([
        'name' => 'Test Service',
        'detail' => 'Test service for assignment',
        'sort_order' => 1,
        'status' => 'active',
    ]);

    // Create a CRO (Chief Revenue Officer)
    $this->cro = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 5,
        'total_leads_assigned' => 20,
        'qualified_leads_count' => 0,
        'conversion_rate' => 15.0,
        'performance_weight' => 1.0,
    ]);
    $this->cro->assignRole($supportAgentRole);

    // Create an advisor (Sales Rep) with matching zone and service
    $this->advisor = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 5,
        'total_leads_assigned' => 10,
        'qualified_leads_count' => 0,
        'converted_leads_count' => 2,
        'conversion_rate' => 20.0,
        'performance_weight' => 1.2,
        'zone_id' => $this->zone->id,
    ]);
    $this->advisor->assignRole($salesRepRole);
    $this->service->assignToUser($this->advisor);
});

it('fires LeadQualified event when lead is qualified', function () {
    Event::fake([LeadQualified::class]);

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    Event::assertDispatched(LeadQualified::class, function ($event) use ($lead) {
        return $event->lead->id === $lead->id
            && $event->qualifiedBy->id === $this->cro->id;
    });
});

it('automatically assigns qualified lead to available advisor', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'qualified_by' => null,
        'qualified_at' => null,
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    // Qualify the lead - this triggers the HandleLeadQualified listener
    $lead->qualifyLead($this->cro);

    // Wait for queue processing (HandleLeadQualified implements ShouldQueue)
    sleep(1);

    $lead->refresh();

    expect($lead->qualified_by)->toBe($this->cro->id)
        ->and($lead->qualified_at)->not->toBeNull()
        ->and($lead->assigned_to)->toBe($this->advisor->id)
        ->and($lead->inquiry_status)->toBe('assigned_to_advisor')
        ->and($lead->assigned_date)->not->toBeNull();
});

it('updates CRO qualified_leads_count metric when lead is qualified', function () {
    expect($this->cro->qualified_leads_count)->toBe(0);

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $this->cro->refresh();

    expect($this->cro->qualified_leads_count)->toBe(1);
});

it('updates advisor current_lead_count when qualified lead is assigned', function () {
    $initialCount = $this->advisor->current_lead_count;

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $this->advisor->refresh();

    expect($this->advisor->current_lead_count)->toBe($initialCount + 1)
        ->and($this->advisor->total_leads_assigned)->toBe(11);
});

it('assigns to best advisor based on weighted round-robin algorithm', function () {
    // Remove default advisor to ensure clean test
    User::whereHas('roles', fn ($q) => $q->where('name', 'sales-rep'))->delete();

    // Create a high-performing advisor with low workload and matching zone/service
    $bestAdvisor = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 2,  // Low workload
        'total_leads_assigned' => 50,
        'converted_leads_count' => 20,
        'conversion_rate' => 40.0,  // High conversion rate
        'performance_weight' => 2.0,  // High performance weight
        'last_assignment_at' => now()->subHours(5),  // Not recently assigned
        'zone_id' => $this->zone->id,
    ]);
    $bestAdvisor->assignRole('sales-rep');
    $this->service->assignToUser($bestAdvisor);

    // Create a low-performing advisor with high workload and matching zone/service
    $lowAdvisor = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 15,  // High workload
        'total_leads_assigned' => 30,
        'converted_leads_count' => 3,
        'conversion_rate' => 10.0,  // Low conversion rate
        'performance_weight' => 0.8,  // Low performance weight
        'last_assignment_at' => now()->subMinutes(5),  // Recently assigned
        'zone_id' => $this->zone->id,
    ]);
    $lowAdvisor->assignRole('sales-rep');
    $this->service->assignToUser($lowAdvisor);

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $lead->refresh();

    // Should assign to the best performing advisor (not the low performer)
    expect($lead->assigned_to)->toBe($bestAdvisor->id)
        ->and($lead->assigned_to)->not->toBe($lowAdvisor->id);
});

it('does not assign to unavailable advisors', function () {
    // Remove all advisors and create only an unavailable one with matching zone/service
    User::whereHas('roles', fn ($q) => $q->where('name', 'sales-rep'))->delete();

    $unavailableAdvisor = User::factory()->create([
        'availability' => false,
        'active' => true,
        'zone_id' => $this->zone->id,
    ]);
    $unavailableAdvisor->assignRole('sales-rep');
    $this->service->assignToUser($unavailableAdvisor);

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $lead->refresh();

    // Lead should remain qualified but not assigned to advisor
    expect($lead->qualified_by)->toBe($this->cro->id)
        ->and($lead->inquiry_status)->toBe('qualified')
        ->and($lead->assigned_to)->toBe($this->cro->id);  // Stays with CRO
});

it('does not assign to inactive advisors', function () {
    // Remove all advisors and create only an inactive one with matching zone/service
    User::whereHas('roles', fn ($q) => $q->where('name', 'sales-rep'))->delete();

    $inactiveAdvisor = User::factory()->create([
        'availability' => true,
        'active' => false,
        'zone_id' => $this->zone->id,
    ]);
    $inactiveAdvisor->assignRole('sales-rep');
    $this->service->assignToUser($inactiveAdvisor);

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $lead->refresh();

    // Lead should remain qualified but not assigned to advisor
    expect($lead->qualified_by)->toBe($this->cro->id)
        ->and($lead->inquiry_status)->toBe('qualified')
        ->and($lead->assigned_to)->toBe($this->cro->id);
});

it('does not assign to advisors at max capacity (30 leads)', function () {
    // Remove all advisors and create only one at max capacity with matching zone/service
    User::whereHas('roles', fn ($q) => $q->where('name', 'sales-rep'))->delete();

    $maxCapacityAdvisor = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 30,
        'zone_id' => $this->zone->id,
    ]);
    $maxCapacityAdvisor->assignRole('sales-rep');
    $this->service->assignToUser($maxCapacityAdvisor);

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $lead->refresh();

    // Lead should remain qualified but not assigned to advisor
    expect($lead->qualified_by)->toBe($this->cro->id)
        ->and($lead->inquiry_status)->toBe('qualified')
        ->and($lead->assigned_to)->toBe($this->cro->id)
        ->and($maxCapacityAdvisor->fresh()->current_lead_count)->toBe(30);  // Unchanged
});

it('handles gracefully when no advisors are available', function () {
    // Remove all advisors
    User::whereHas('roles', fn ($q) => $q->where('name', 'sales-rep'))->delete();

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $lead->refresh();

    // Lead should be qualified but remain with CRO
    expect($lead->qualified_by)->toBe($this->cro->id)
        ->and($lead->qualified_at)->not->toBeNull()
        ->and($lead->inquiry_status)->toBe('qualified')
        ->and($lead->assigned_to)->toBe($this->cro->id);
});

it('creates activity log when lead is qualified and assigned', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $lead->refresh();

    // Should have activity logs for qualification and assignment
    expect($lead->activities()->count())->toBeGreaterThan(0);

    // Check for status_change activities
    $hasQualificationActivity = $lead->activities()
        ->where('type', 'status_change')
        ->exists();

    // Check for assignment_change activities
    $hasAssignmentActivity = $lead->activities()
        ->where('type', 'assignment_change')
        ->exists();

    expect($hasQualificationActivity)->toBeTrue()
        ->and($hasAssignmentActivity)->toBeTrue();
});

it('distributes leads fairly across multiple advisors', function () {
    // Remove default advisor to control the test
    User::whereHas('roles', fn ($q) => $q->where('name', 'sales-rep'))->delete();

    // Create 3 advisors with similar stats and matching zone/service
    $advisor1 = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 0,
        'total_leads_assigned' => 10,
        'conversion_rate' => 20.0,
        'performance_weight' => 1.0,
        'zone_id' => $this->zone->id,
    ]);
    $advisor1->assignRole('sales-rep');
    $this->service->assignToUser($advisor1);

    $advisor2 = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 0,
        'total_leads_assigned' => 10,
        'conversion_rate' => 20.0,
        'performance_weight' => 1.0,
        'zone_id' => $this->zone->id,
    ]);
    $advisor2->assignRole('sales-rep');
    $this->service->assignToUser($advisor2);

    $advisor3 = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 0,
        'total_leads_assigned' => 10,
        'conversion_rate' => 20.0,
        'performance_weight' => 1.0,
        'zone_id' => $this->zone->id,
    ]);
    $advisor3->assignRole('sales-rep');
    $this->service->assignToUser($advisor3);

    // Qualify 9 leads with matching city/service
    for ($i = 0; $i < 9; $i++) {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->cro->id,
            'inquiry_status' => 'assigned_to_cro',
            'city' => $this->city->name,
            'service_id' => $this->service->id,
        ]);

        $lead->qualifyLead($this->cro);
        sleep(1);  // Allow queue to process
    }

    // Check that leads are distributed
    $advisor1->refresh();
    $advisor2->refresh();
    $advisor3->refresh();

    $total = $advisor1->current_lead_count + $advisor2->current_lead_count + $advisor3->current_lead_count;

    expect($total)->toBe(9)
        ->and($advisor1->current_lead_count)->toBeGreaterThan(0)
        ->and($advisor2->current_lead_count)->toBeGreaterThan(0)
        ->and($advisor3->current_lead_count)->toBeGreaterThan(0);
});

it('updates advisor last_assignment_at timestamp', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // Wait for queue processing
    sleep(1);

    $lead->refresh();
    $this->advisor->refresh();

    // Verify the lead was assigned to the advisor
    expect($lead->assigned_to)->toBe($this->advisor->id)
        ->and($this->advisor->last_assignment_at)->not->toBeNull();
});

it('dispatches LeadQualified event that triggers async listener', function () {
    Event::fake([LeadQualified::class]);

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    // The event should be dispatched (which triggers HandleLeadQualified listener)
    Event::assertDispatched(LeadQualified::class, function ($event) use ($lead) {
        return $event->lead->id === $lead->id;
    });
});

it('maintains data integrity when qualifying multiple leads simultaneously', function () {
    $initialCroQualifiedCount = $this->cro->qualified_leads_count;
    $initialAdvisorCount = $this->advisor->current_lead_count;

    // Create and qualify 3 leads with matching city/service
    $leads = collect([1, 2, 3])->map(function () {
        return Lead::factory()->create([
            'assigned_to' => $this->cro->id,
            'inquiry_status' => 'assigned_to_cro',
            'city' => $this->city->name,
            'service_id' => $this->service->id,
        ]);
    });

    foreach ($leads as $lead) {
        $lead->qualifyLead($this->cro);
    }

    // Wait for all queue jobs to process
    sleep(3);

    $this->cro->refresh();
    $this->advisor->refresh();

    // Verify metrics are updated correctly
    expect($this->cro->qualified_leads_count)->toBe($initialCroQualifiedCount + 3)
        ->and($this->advisor->current_lead_count)->toBe($initialAdvisorCount + 3);
});

it('does not assign when lead has no matching city/zone', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => 'Nonexistent City',
        'service_id' => $this->service->id,
    ]);

    $lead->qualifyLead($this->cro);

    sleep(1);

    $lead->refresh();

    // Lead should remain qualified but not assigned to advisor
    expect($lead->qualified_by)->toBe($this->cro->id)
        ->and($lead->inquiry_status)->toBe('qualified')
        ->and($lead->assigned_to)->toBe($this->cro->id);
});

it('does not assign when lead has no service', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
        'city' => $this->city->name,
        'service_id' => null,
    ]);

    $lead->qualifyLead($this->cro);

    sleep(1);

    $lead->refresh();

    // Lead should remain qualified but not assigned to advisor
    expect($lead->qualified_by)->toBe($this->cro->id)
        ->and($lead->inquiry_status)->toBe('qualified')
        ->and($lead->assigned_to)->toBe($this->cro->id);
});
