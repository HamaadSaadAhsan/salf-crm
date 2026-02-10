<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    $salesRepRole = \Spatie\Permission\Models\Role::create(['name' => 'sales-rep']);
    $supportAgentRole = \Spatie\Permission\Models\Role::create(['name' => 'support-agent']);
    $adminRole = \Spatie\Permission\Models\Role::create(['name' => 'super-admin']);

    $this->advisor = User::factory()->create();
    $this->advisor->assignRole($salesRepRole);

    $this->otherUser = User::factory()->create();
    $this->otherUser->assignRole($supportAgentRole);

    $this->admin = User::factory()->create();
    $this->admin->assignRole($adminRole);

    $this->lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'advisor_stage' => 'new',
        'assigned_to' => $this->advisor->id,
    ]);
});

it('allows assigned advisor to progress from new to contacted', function () {
    $response = $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'contacted',
        ]);

    $response->assertOk()
        ->assertJsonPath('success', 'Advisor stage updated successfully.');

    $this->lead->refresh();
    expect($this->lead->advisor_stage)->toBe('contacted');
});

it('creates a lead activity on stage change', function () {
    $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'contacted',
        ]);

    expect(LeadActivity::where('lead_id', $this->lead->id)
        ->where('type', 'status_change')
        ->where('subject', 'Advisor stage: Contacted')
        ->exists())->toBeTrue();
});

it('progresses through the full lifecycle', function () {
    $stages = ['contacted', 'meeting', 'contract_signed', 'initial_payment', 'won'];

    foreach ($stages as $stage) {
        $extra = [];
        if ($stage === 'initial_payment') {
            $extra['initial_payment_amount'] = 5000;
        }

        $response = $this->actingAs($this->advisor)
            ->putJson(route('leads.update-advisor-stage', $this->lead), array_merge([
                'stage' => $stage,
            ], $extra));

        $response->assertOk();
        $this->lead->refresh();
    }

    expect($this->lead->advisor_stage)->toBe('won')
        ->and($this->lead->inquiry_status)->toBe('won');
});

it('rejects invalid transitions', function () {
    $response = $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'contract_signed',
        ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => "Cannot transition from 'new' to 'contract_signed'."]);
});

it('rejects unauthorized users', function () {
    $response = $this->actingAs($this->otherUser)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'contacted',
        ]);

    $response->assertForbidden();
});

it('allows admin users to progress stage', function () {
    $response = $this->actingAs($this->admin)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'contacted',
        ]);

    $response->assertOk();
    expect($this->lead->fresh()->advisor_stage)->toBe('contacted');
});

it('creates a LeadCase on contract_signed', function () {
    // Progress to contract_signed
    $this->lead->update(['advisor_stage' => 'meeting']);

    $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'contract_signed',
        ]);

    expect(LeadCase::where('lead_id', $this->lead->id)->exists())->toBeTrue();
});

it('updates LeadCase on initial_payment', function () {
    $this->lead->update(['advisor_stage' => 'contract_signed']);
    LeadCase::create(['lead_id' => $this->lead->id, 'advisor_id' => $this->advisor->id]);

    $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'initial_payment',
            'initial_payment_amount' => 2500,
        ]);

    $leadCase = LeadCase::where('lead_id', $this->lead->id)->first();
    expect((float) $leadCase->initial_payment_amount)->toBe(2500.0)
        ->and($leadCase->initial_payment_at)->not->toBeNull();
});

it('requires reason when marking as lost', function () {
    $response = $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'lost',
        ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('reason');
});

it('marks lead as lost with reason', function () {
    $response = $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'lost',
            'reason' => 'Client not interested anymore',
        ]);

    $response->assertOk();
    $this->lead->refresh();
    expect($this->lead->advisor_stage)->toBe('lost')
        ->and($this->lead->inquiry_status)->toBe('lost')
        ->and($this->lead->loss_reason)->toBe('Client not interested anymore');
});

it('rejects stage change when lead is not assigned to advisor', function () {
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'assigned_to' => $this->advisor->id,
    ]);

    $response = $this->actingAs($this->admin)
        ->putJson(route('leads.update-advisor-stage', $lead), [
            'stage' => 'contacted',
        ]);

    $response->assertStatus(422)
        ->assertJsonFragment(['message' => 'Lead is not assigned to an advisor.']);
});

it('requires initial_payment_amount when stage is initial_payment', function () {
    $this->lead->update(['advisor_stage' => 'contract_signed']);

    $response = $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $this->lead), [
            'stage' => 'initial_payment',
        ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors('initial_payment_amount');
});
