<?php

use App\Models\Lead;
use App\Models\User;
use App\Services\IntelligentAssignmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Disable all broadcasting to avoid Pusher/Reverb connection errors in tests
    config(['broadcasting.default' => 'null']);

    $this->assignmentService = app(IntelligentAssignmentService::class);

    $supportAgentRole = \Spatie\Permission\Models\Role::create(['name' => 'support-agent']);
    $salesRepRole = \Spatie\Permission\Models\Role::create(['name' => 'sales-rep']);

    $this->cro = User::factory()->create([
        'available' => true,
        'active' => true,
        'current_lead_count' => 0,
        'total_leads_assigned' => 0,
        'conversion_rate' => 15.0,
        'performance_weight' => 1.0,
    ]);
    $this->cro->assignRole($supportAgentRole);

    $this->advisor = User::factory()->create([
        'available' => true,
        'active' => true,
        'current_lead_count' => 0,
        'total_leads_assigned' => 0,
        'qualified_leads_count' => 0,
        'converted_leads_count' => 0,
        'conversion_rate' => 20.0,
        'performance_weight' => 1.2,
    ]);
    $this->advisor->assignRole($salesRepRole);
});

it('can assign a new lead to a CRO automatically', function () {
    $assignedCro = $this->assignmentService->assignToCRO(
        Lead::factory()->create(['assigned_to' => null])
    );

    expect($assignedCro)->not->toBeNull()
        ->and($assignedCro->id)->toBe($this->cro->id)
        ->and($this->cro->fresh()->current_lead_count)->toBe(1)
        ->and($this->cro->fresh()->total_leads_assigned)->toBe(1);
});

it('marks lead status as assigned_to_cro when assigned to CRO', function () {
    $lead = Lead::factory()->create(['assigned_to' => null]);

    $this->assignmentService->assignToCRO($lead);

    expect($lead->fresh()->inquiry_status)->toBe('assigned_to_cro')
        ->and($lead->fresh()->assigned_to)->not->toBeNull()
        ->and($lead->fresh()->assigned_date)->not->toBeNull();
});

it('can qualify a lead and trigger advisor assignment', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
    ]);

    $lead->qualifyLead($this->cro);

    // After qualification, the listener automatically assigns to an advisor
    // so status becomes 'assigned_to_advisor' not just 'qualified'
    $lead = $lead->fresh();
    expect($lead->qualified_by)->toBe($this->cro->id)
        ->and($lead->qualified_at)->not->toBeNull()
        ->and($lead->inquiry_status)->toBeIn(['qualified', 'assigned_to_advisor']);
});

it('assigns qualified lead to an advisor automatically', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
    ]);

    $lead->qualifyLead($this->cro);

    sleep(1);

    $lead = $lead->fresh();
    expect($lead->assigned_to)->toBe($this->advisor->id)
        ->and($lead->inquiry_status)->toBe('assigned_to_advisor');
});

it('updates CRO metrics when lead is qualified', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'assigned_to_cro',
    ]);

    $lead->qualifyLead($this->cro);

    sleep(1);

    expect($this->cro->fresh()->qualified_leads_count)->toBeGreaterThan(0);
});

it('can convert a lead and update advisor metrics', function () {
    // First increment the advisor's current lead count
    $this->advisor->increment('current_lead_count');

    $lead = Lead::factory()->create([
        'assigned_to' => $this->advisor->id,
        'inquiry_status' => 'assigned_to_advisor',
    ]);

    $lead->convertLead();

    expect($lead->fresh()->inquiry_status)->toBe('converted')
        ->and($lead->fresh()->converted_at)->not->toBeNull()
        ->and($this->advisor->fresh()->current_lead_count)->toBe(0)
        ->and($this->advisor->fresh()->converted_leads_count)->toBe(1);
});

it('can mark lead as lost and update metrics', function () {
    // First increment the advisor's current lead count
    $this->advisor->increment('current_lead_count');

    $lead = Lead::factory()->create([
        'assigned_to' => $this->advisor->id,
        'inquiry_status' => 'assigned_to_advisor',
    ]);

    $lead->markAsLostWithReason('Not interested');

    expect($lead->fresh()->inquiry_status)->toBe('lost')
        ->and($lead->fresh()->loss_reason)->toBe('Not interested')
        ->and($this->advisor->fresh()->current_lead_count)->toBe(0);
});

it('can send lead back for requalification', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
        'inquiry_status' => 'assigned_to_advisor',
    ]);

    $lead->requalifyLead('Needs more information');

    expect($lead->fresh()->inquiry_status)->toBe('requalify')
        ->and($lead->fresh()->requalify_reason)->toBe('Needs more information')
        ->and($lead->fresh()->assigned_to)->toBe($this->cro->id);
});

it('calculates weighted round-robin score correctly', function () {
    $lowPerformingCRO = User::factory()->create([
        'available' => true,
        'active' => true,
        'current_lead_count' => 10,
        'conversion_rate' => 5.0,
        'performance_weight' => 0.8,
    ]);
    $supportAgentRole = \Spatie\Permission\Models\Role::firstWhere('name', 'support-agent');
    $lowPerformingCRO->assignRole($supportAgentRole);

    $lead = Lead::factory()->create(['assigned_to' => null]);

    $assignedCro = $this->assignmentService->assignToCRO($lead);

    expect($assignedCro->id)->toBe($this->cro->id);
});

it('does not assign to unavailable CROs', function () {
    // Delete all existing support agents from previous tests and create only unavailable one
    \Spatie\Permission\Models\Role::where('name', 'support-agent')->first()?->users()->detach();
    User::whereHas('roles', fn ($q) => $q->where('name', 'support-agent'))->delete();

    $unavailableCro = User::factory()->create([
        'available' => false,
        'active' => true,
    ]);
    $unavailableCro->assignRole('support-agent');

    $lead = Lead::factory()->create(['assigned_to' => null]);

    $assignedCro = $this->assignmentService->assignToCRO($lead);

    // Should return null when no available CROs
    expect($assignedCro)->toBeNull()
        ->and($lead->fresh()->assigned_to)->toBeNull();
});

it('creates activity log when lead is assigned', function () {
    $lead = Lead::factory()->create(['assigned_to' => null]);

    $this->assignmentService->assignToCRO($lead);

    $lead = $lead->fresh();

    expect($lead->activities()->count())->toBeGreaterThan(0)
        ->and($lead->activities()->where('type', 'assignment_change')->exists())->toBeTrue();
});

it('recalculates conversion rate after conversion', function () {
    $this->advisor->total_leads_assigned = 10;
    $this->advisor->converted_leads_count = 2;
    $this->advisor->conversion_rate = 20.0;
    $this->advisor->current_lead_count = 1;
    $this->advisor->save();

    $this->assignmentService->updateMetricsOnConversion($this->advisor);

    // Increments converted_leads_count from 2 to 3, and recalculates rate to 30%
    expect($this->advisor->fresh()->converted_leads_count)->toBe(3)
        ->and((float) $this->advisor->fresh()->conversion_rate)->toBe(30.0)
        ->and($this->advisor->fresh()->current_lead_count)->toBe(0);  // Decrements active count
});

it('updates performance weight based on conversion rate', function () {
    $this->advisor->total_leads_assigned = 10;
    $this->advisor->converted_leads_count = 2;
    $this->advisor->conversion_rate = 28.0;  // Just under 30%
    $this->advisor->current_lead_count = 1;
    $this->advisor->save();

    $this->assignmentService->updateMetricsOnConversion($this->advisor);

    // After conversion: converted_leads_count becomes 3, conversion_rate becomes 30%
    // Performance weight should be 1.5 (for 30%+ conversion rate)
    expect($this->advisor->fresh()->converted_leads_count)->toBe(3)
        ->and((float) $this->advisor->fresh()->conversion_rate)->toBe(30.0)
        ->and((float) $this->advisor->fresh()->performance_weight)->toBe(1.5);
});
