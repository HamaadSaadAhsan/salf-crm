<?php

use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    Role::create(['name' => 'super-admin']);
    $this->admin = User::factory()->create();
    $this->admin->assignRole('super-admin');
});

it('creates a lead with required fields only', function () {
    $this->actingAs($this->admin)
        ->post(route('leads.store'), [
            'name' => 'Jane Doe',
        ])
        ->assertRedirect();

    $lead = Lead::where('name', 'Jane Doe')->first();

    expect($lead)->not->toBeNull()
        ->and($lead->inquiry_status)->toBe('new')
        ->and($lead->priority)->toBe('medium');
});

it('creates a lead with all optional fields', function () {
    $source = LeadSource::factory()->create(['status' => 'active']);

    $this->actingAs($this->admin)
        ->post(route('leads.store'), [
            'name' => 'John Smith',
            'email' => 'john@example.com',
            'phone' => '+1234567890',
            'occupation' => 'CEO',
            'inquiry_status' => 'contacted',
            'priority' => 'high',
            'lead_source_id' => $source->id,
            'detail' => 'Interested in premium plan.',
        ])
        ->assertRedirect();

    $lead = Lead::where('email', 'john@example.com')->first();

    expect($lead)->not->toBeNull()
        ->and($lead->name)->toBe('John Smith')
        ->and($lead->phone)->toBe('+1234567890')
        ->and($lead->occupation)->toBe('CEO')
        ->and($lead->inquiry_status)->toBe('contacted')
        ->and($lead->priority)->toBe('high')
        ->and($lead->lead_source_id)->toBe($source->id)
        ->and($lead->detail)->toBe('Interested in premium plan.');
});

it('fails validation when name is missing', function () {
    $this->actingAs($this->admin)
        ->post(route('leads.store'), [
            'email' => 'test@example.com',
        ])
        ->assertSessionHasErrors('name');
});

it('fails validation with duplicate email', function () {
    Lead::factory()->create(['email' => 'duplicate@example.com']);

    $this->actingAs($this->admin)
        ->post(route('leads.store'), [
            'name' => 'Another Lead',
            'email' => 'duplicate@example.com',
        ])
        ->assertSessionHasErrors('email');
});

it('fails validation with invalid status', function () {
    $this->actingAs($this->admin)
        ->post(route('leads.store'), [
            'name' => 'Test Lead',
            'inquiry_status' => 'invalid-status',
        ])
        ->assertSessionHasErrors('inquiry_status');
});

it('fails validation with invalid priority', function () {
    $this->actingAs($this->admin)
        ->post(route('leads.store'), [
            'name' => 'Test Lead',
            'priority' => 'critical',
        ])
        ->assertSessionHasErrors('priority');
});

it('sets created_by to authenticated user', function () {
    $this->actingAs($this->admin)
        ->post(route('leads.store'), ['name' => 'Auto Assigned'])
        ->assertRedirect();

    $lead = Lead::where('name', 'Auto Assigned')->first();

    expect($lead->created_by)->toBe($this->admin->id);
});
