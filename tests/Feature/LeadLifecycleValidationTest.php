<?php

use App\Models\City;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadCase;
use App\Models\Service;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    // Create roles
    $this->croRole = Role::create(['name' => 'support-agent']);
    $this->advisorRole = Role::create(['name' => 'sales-rep']);
    Role::create(['name' => 'senior-sales-rep']);
    $this->adminRole = Role::create(['name' => 'super-admin']);

    // Create permissions and assign to roles
    $editPermission = Permission::create(['name' => 'edit leads']);
    $viewPermission = Permission::create(['name' => 'view leads']);
    $this->croRole->givePermissionTo([$editPermission, $viewPermission]);
    $this->advisorRole->givePermissionTo([$editPermission, $viewPermission]);
    $this->adminRole->givePermissionTo([$editPermission, $viewPermission]);

    // Create city, zone, and service for qualification tests
    $this->city = City::factory()->create(['name' => 'Dubai']);
    $this->zone = Zone::factory()->create(['name' => 'UAE Zone']);
    $this->zone->cities()->attach($this->city);
    $this->service = Service::create([
        'name' => 'Test Service',
        'detail' => 'Test service',
        'sort_order' => 1,
        'status' => 'active',
    ]);

    // Create users
    $this->cro = User::factory()->create();
    $this->cro->assignRole($this->croRole);

    $this->advisor = User::factory()->create([
        'availability' => true,
        'active' => true,
        'current_lead_count' => 0,
        'zone_id' => $this->zone->id,
    ]);
    $this->advisor->assignRole($this->advisorRole);
    $this->service->assignToUser($this->advisor);

    $this->admin = User::factory()->create();
    $this->admin->assignRole($this->adminRole);
});

// ── CRO Status Transition Validation ────────────────────────────────

it('allows CRO to transition new → contacted', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'assigned_to' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'contacted',
        ]);

    $response->assertOk();
    expect($lead->fresh()->inquiry_status)->toBe('contacted');
});

it('allows CRO to transition contacted → qualified', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'contacted',
        'assigned_to' => $this->cro->id,
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'qualified',
        ]);

    $response->assertOk();
    // Qualifying with an available advisor auto-assigns to advisor
    expect($lead->fresh()->inquiry_status)->toBeIn(['qualified', 'assigned_to_advisor']);
});

it('rejects CRO skipping steps: new → qualified', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'assigned_to' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'qualified',
        ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => "Cannot transition from 'new' to 'qualified'."]);
});

it('rejects CRO skipping steps: new → assigned_to_advisor', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'assigned_to' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'assigned_to_advisor',
        ]);

    // assigned_to_advisor is not in the allowed statuses list for non-assigned leads
    $response->assertStatus(422);
});

it('allows CRO to mark lead as lost from any CRO stage', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'contacted',
        'assigned_to' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'lost',
            'loss_reason' => 'Client not responsive',
        ]);

    $response->assertOk();
    expect($lead->fresh()->inquiry_status)->toBe('lost')
        ->and($lead->fresh()->loss_reason)->toBe('Client not responsive');
});

it('allows CRO to move lead to nurturing', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'contacted',
        'assigned_to' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'nurturing',
        ]);

    $response->assertOk();
    expect($lead->fresh()->inquiry_status)->toBe('nurturing');
});

// ── CRO Restrictions When Lead is Assigned to Advisor ───────────────

it('prevents CRO from editing fields when lead is assigned to advisor', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'name' => 'Changed Name',
        ]);

    $response->assertForbidden();
});

it('prevents CRO from reassigning lead when assigned to advisor', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'assigned_to' => $this->cro->id,
        ]);

    $response->assertForbidden();
});

it('allows CRO to requalify lead assigned to advisor with reason', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'requalify',
            'requalify_reason' => 'Lead needs more information',
        ]);

    $response->assertOk();
    $lead->refresh();
    expect($lead->inquiry_status)->toBe('requalify')
        ->and($lead->requalify_reason)->toBe('Lead needs more information')
        ->and($lead->advisor_stage)->toBeNull()
        ->and($lead->assigned_to)->toBe($this->cro->id);
});

// ── Loss Reason Validation ──────────────────────────────────────────

it('requires loss_reason when marking lead as lost via update', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'contacted',
        'assigned_to' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'lost',
        ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.loss_reason.0', 'A reason is required when marking a lead as lost.');
});

// ── Requalify Reason Validation ─────────────────────────────────────

it('requires requalify_reason when sending lead to requalify', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'requalify',
        ]);

    $response->assertStatus(422)
        ->assertJsonPath('errors.requalify_reason.0', 'A reason is required when requalifying a lead.');
});

// ── Requalify → Re-assign Flow ──────────────────────────────────────

it('requalify flow preserves advisor assignment', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'advisor_stage' => 'meeting',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    // CRO requalifies
    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'requalify',
            'requalify_reason' => 'Needs more docs',
        ]);

    $lead->refresh();
    expect($lead->inquiry_status)->toBe('requalify')
        ->and($lead->requalified_from_advisor_id)->toBe($this->advisor->id)
        ->and($lead->assigned_to)->toBe($this->cro->id)
        ->and($lead->advisor_stage)->toBeNull();

    // CRO re-qualifies and moves to contacted
    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'contacted',
        ]);

    $lead->refresh();
    expect($lead->inquiry_status)->toBe('contacted');
});

it('requalify flow: CRO cannot skip directly to assigned_to_advisor from requalify', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'requalify',
        'assigned_to' => $this->cro->id,
        'requalified_from_advisor_id' => $this->advisor->id,
    ]);

    $response = $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'assigned_to_advisor',
        ]);

    $response->assertStatus(422);
});

// ── LeadCase Advisor ID Update on Requalification ───────────────────

it('updates LeadCase advisor_id on requalification cycle', function () {
    $newAdvisor = User::factory()->create();
    $newAdvisor->assignRole($this->advisorRole);

    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'advisor_stage' => 'contract_signed',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    // Create a LeadCase with original advisor
    LeadCase::create([
        'lead_id' => $lead->id,
        'advisor_id' => $this->advisor->id,
    ]);

    // Requalify the lead
    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'requalify',
            'requalify_reason' => 'Wrong service',
        ]);

    $lead->refresh();
    expect($lead->requalified_from_advisor_id)->toBe($this->advisor->id);

    // Simulate reassignment to a different advisor (admin overrides)
    $lead->update([
        'inquiry_status' => 'requalify',
        'requalified_from_advisor_id' => $newAdvisor->id,
    ]);

    // Admin sends directly from requalify → assigned_to_advisor (admin bypass)
    $this->actingAs($this->admin)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'assigned_to_advisor',
        ]);

    $lead->refresh();
    $leadCase = LeadCase::where('lead_id', $lead->id)->first();

    expect($lead->inquiry_status)->toBe('assigned_to_advisor')
        ->and($lead->advisor_stage)->toBe('new')
        ->and($lead->assigned_to)->toBe($newAdvisor->id)
        ->and($leadCase->advisor_id)->toBe($newAdvisor->id);
});

// ── Admin Bypass ────────────────────────────────────────────────────

it('allows admin to skip CRO transition rules', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'assigned_to' => $this->cro->id,
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $response = $this->actingAs($this->admin)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'qualified',
        ]);

    $response->assertOk();
    // Admin can skip transition rules; qualifying with available advisor auto-assigns
    expect($lead->fresh()->inquiry_status)->toBeIn(['qualified', 'assigned_to_advisor']);
});

// ── Activity Logging ────────────────────────────────────────────────

it('logs activity when lead status changes', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'assigned_to' => $this->cro->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'contacted',
        ]);

    expect(LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'status_change')
        ->exists())->toBeTrue();
});

it('logs requalification with reason in metadata', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'requalify',
            'requalify_reason' => 'Needs new documents',
        ]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('subject', 'Lead requalified by advisor')
        ->first();

    expect($activity)->not->toBeNull()
        ->and($activity->metadata['requalify_reason'])->toBe('Needs new documents');
});

// ── Advisor Stage + inquiry_status Sync ─────────────────────────────

it('initializes advisor_stage to new when lead moves to assigned_to_advisor', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'qualified',
        'assigned_to' => $this->advisor->id,
    ]);

    $this->actingAs($this->admin)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'assigned_to_advisor',
        ]);

    expect($lead->fresh()->advisor_stage)->toBe('new');
});

it('clears advisor_stage when lead is requalified', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'advisor_stage' => 'meeting',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'requalify',
            'requalify_reason' => 'Wrong fit',
        ]);

    expect($lead->fresh()->advisor_stage)->toBeNull();
});

it('syncs advisor_stage to won when inquiry_status set to won', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'advisor_stage' => 'initial_payment',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'won',
        ]);

    expect($lead->fresh()->advisor_stage)->toBe('won');
});

it('syncs advisor_stage to lost when inquiry_status set to lost', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'advisor_stage' => 'contacted',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'lost',
            'loss_reason' => 'Budget too low',
        ]);

    $lead->refresh();
    expect($lead->advisor_stage)->toBe('lost')
        ->and($lead->loss_reason)->toBe('Budget too low');
});
