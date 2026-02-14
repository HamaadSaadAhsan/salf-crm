<?php

use App\Models\Lead;
use App\Models\LeadServiceAssignment;
use App\Models\Service;
use App\Models\User;
use App\Services\LeadAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    $this->assignmentService = app(LeadAssignmentService::class);

    $salesRepRole = \Spatie\Permission\Models\Role::create(['name' => 'sales-rep']);

    $this->advisor = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 5,
        'total_leads_assigned' => 10,
        'conversion_rate' => 20.0,
        'performance_weight' => 1.2,
    ]);
    $this->advisor->assignRole($salesRepRole);

    // Create parent service (Citizenship Programs)
    $this->parentService = Service::create([
        'name' => 'Citizenship by Investment Programs',
        'detail' => 'Various citizenship programs through investment',
        'sort_order' => 1,
        'status' => 'active',
    ]);

    // Create child services
    $this->dominicaService = Service::create([
        'name' => 'Dominica Citizenship Program',
        'detail' => 'Citizenship through investment in Dominica',
        'country_code' => 'DM',
        'country_name' => 'Dominica',
        'parent_id' => $this->parentService->id,
        'sort_order' => 1,
        'status' => 'active',
    ]);

    $this->grenadaService = Service::create([
        'name' => 'Grenada Citizenship Program',
        'detail' => 'Grenada citizenship through investment',
        'country_code' => 'GD',
        'country_name' => 'Grenada',
        'parent_id' => $this->parentService->id,
        'sort_order' => 2,
        'status' => 'active',
    ]);

    $this->stKittsService = Service::create([
        'name' => 'St. Kitts and Nevis Citizenship',
        'detail' => 'Citizenship program for St. Kitts and Nevis',
        'country_code' => 'KN',
        'country_name' => 'St. Kitts and Nevis',
        'parent_id' => $this->parentService->id,
        'sort_order' => 3,
        'status' => 'active',
    ]);
});

it('creates service assignment for parent and all child services when lead is assigned with parent service', function () {
    $lead = Lead::factory()->create([
        'service_id' => $this->parentService->id,
        'inquiry_status' => 'new',
    ]);

    // Assign the lead to the advisor
    $assignedAdvisor = $this->assignmentService->assignToAdvisor($lead, null);

    expect($assignedAdvisor)->not->toBeNull()
        ->and($assignedAdvisor->id)->toBe($this->advisor->id);

    // Should create assignment for parent service
    $parentAssignment = LeadServiceAssignment::where('lead_id', $lead->id)
        ->where('service_id', $this->parentService->id)
        ->where('user_id', $this->advisor->id)
        ->first();

    expect($parentAssignment)->not->toBeNull()
        ->and($parentAssignment->is_parent_service)->toBeTrue()
        ->and($parentAssignment->parent_service_id)->toBeNull();

    // Should create assignments for all child services
    $childAssignments = LeadServiceAssignment::where('lead_id', $lead->id)
        ->where('user_id', $this->advisor->id)
        ->where('parent_service_id', $this->parentService->id)
        ->get();

    expect($childAssignments->count())->toBe(3)
        ->and($childAssignments->pluck('service_id')->toArray())->toContain($this->dominicaService->id)
        ->and($childAssignments->pluck('service_id')->toArray())->toContain($this->grenadaService->id)
        ->and($childAssignments->pluck('service_id')->toArray())->toContain($this->stKittsService->id);

    // All child assignments should have is_parent_service = false
    expect($childAssignments->every(fn ($a) => $a->is_parent_service === false))->toBeTrue();
});

it('can track how many of each child service were assigned to an advisor', function () {
    // Create multiple leads with parent service
    $lead1 = Lead::factory()->create(['service_id' => $this->parentService->id]);
    $lead2 = Lead::factory()->create(['service_id' => $this->parentService->id]);
    $lead3 = Lead::factory()->create(['service_id' => $this->parentService->id]);

    // Assign all leads to the same advisor
    $this->assignmentService->assignToAdvisor($lead1, null);
    $this->assignmentService->assignToAdvisor($lead2, null);
    $this->assignmentService->assignToAdvisor($lead3, null);

    // Check Dominica assignments for this advisor
    $dominicaCount = LeadServiceAssignment::getCountByUserAndService(
        $this->advisor->id,
        $this->dominicaService->id
    );

    // Check Grenada assignments for this advisor
    $grenadaCount = LeadServiceAssignment::getCountByUserAndService(
        $this->advisor->id,
        $this->grenadaService->id
    );

    // Check St. Kitts assignments for this advisor
    $stKittsCount = LeadServiceAssignment::getCountByUserAndService(
        $this->advisor->id,
        $this->stKittsService->id
    );

    expect($dominicaCount)->toBe(3)
        ->and($grenadaCount)->toBe(3)
        ->and($stKittsCount)->toBe(3);
});

it('can get breakdown of child service assignments for an advisor', function () {
    // Create leads with parent service
    $lead1 = Lead::factory()->create(['service_id' => $this->parentService->id]);
    $lead2 = Lead::factory()->create(['service_id' => $this->parentService->id]);

    // Assign to advisor
    $this->assignmentService->assignToAdvisor($lead1, null);
    $this->assignmentService->assignToAdvisor($lead2, null);

    // Get breakdown of child service assignments
    $childServiceBreakdown = LeadServiceAssignment::getChildServiceCountsByUser(
        $this->advisor->id,
        $this->parentService->id
    );

    expect($childServiceBreakdown)->toBeArray()
        ->and($childServiceBreakdown['Dominica Citizenship Program'])->toBe(2)
        ->and($childServiceBreakdown['Grenada Citizenship Program'])->toBe(2)
        ->and($childServiceBreakdown['St. Kitts and Nevis Citizenship'])->toBe(2);
});

it('assigns child service correctly when lead is directly assigned to a child service', function () {
    // Create lead with child service (not parent)
    $lead = Lead::factory()->create([
        'service_id' => $this->dominicaService->id,
        'inquiry_status' => 'new',
    ]);

    $assignedAdvisor = $this->assignmentService->assignToAdvisor($lead, null);

    expect($assignedAdvisor)->not->toBeNull();

    // Should create assignment for ONLY the child service
    $childAssignment = LeadServiceAssignment::where('lead_id', $lead->id)
        ->where('service_id', $this->dominicaService->id)
        ->where('user_id', $this->advisor->id)
        ->first();

    expect($childAssignment)->not->toBeNull()
        ->and($childAssignment->is_parent_service)->toBeFalse()
        ->and($childAssignment->parent_service_id)->toBe($this->parentService->id);

    // Should NOT create assignments for other child services
    $otherChildAssignments = LeadServiceAssignment::where('lead_id', $lead->id)
        ->whereIn('service_id', [$this->grenadaService->id, $this->stKittsService->id])
        ->count();

    expect($otherChildAssignments)->toBe(0);

    // Should NOT create assignment for parent service
    $parentAssignment = LeadServiceAssignment::where('lead_id', $lead->id)
        ->where('service_id', $this->parentService->id)
        ->count();

    expect($parentAssignment)->toBe(0);
});

it('matches advisors assigned to parent service with leads of child services', function () {
    // Assign advisor to parent service
    $this->parentService->assignToUser($this->advisor);

    // Create lead with child service
    $lead = Lead::factory()->create([
        'service_id' => $this->dominicaService->id,
        'inquiry_status' => 'new',
    ]);

    // The advisor should be matched because they're assigned to the parent service
    $assignedAdvisor = $this->assignmentService->assignToAdvisor($lead, null);

    expect($assignedAdvisor)->not->toBeNull()
        ->and($assignedAdvisor->id)->toBe($this->advisor->id);
});

it('parent service has children relationship', function () {
    expect($this->parentService->children()->count())->toBe(3)
        ->and($this->parentService->is_parent)->toBeTrue();
});

it('child service has parent relationship', function () {
    expect($this->dominicaService->parent)->not->toBeNull()
        ->and($this->dominicaService->parent->id)->toBe($this->parentService->id)
        ->and($this->dominicaService->is_parent)->toBeFalse();
});

it('can get all descendants of a parent service', function () {
    $descendants = $this->parentService->getAllDescendants();

    expect($descendants->count())->toBe(3)
        ->and($descendants->pluck('id')->toArray())->toContain($this->dominicaService->id)
        ->and($descendants->pluck('id')->toArray())->toContain($this->grenadaService->id)
        ->and($descendants->pluck('id')->toArray())->toContain($this->stKittsService->id);
});

it('creates separate assignments for multiple leads with same parent service', function () {
    $lead1 = Lead::factory()->create(['service_id' => $this->parentService->id]);
    $lead2 = Lead::factory()->create(['service_id' => $this->parentService->id]);

    $this->assignmentService->assignToAdvisor($lead1, null);
    $this->assignmentService->assignToAdvisor($lead2, null);

    // Lead 1 should have 4 assignments (1 parent + 3 children)
    $lead1Assignments = LeadServiceAssignment::where('lead_id', $lead1->id)->count();
    expect($lead1Assignments)->toBe(4);

    // Lead 2 should have 4 assignments (1 parent + 3 children)
    $lead2Assignments = LeadServiceAssignment::where('lead_id', $lead2->id)->count();
    expect($lead2Assignments)->toBe(4);

    // Total assignments for advisor should be 8 (4 per lead)
    $totalAssignments = LeadServiceAssignment::where('user_id', $this->advisor->id)->count();
    expect($totalAssignments)->toBe(8);
});
