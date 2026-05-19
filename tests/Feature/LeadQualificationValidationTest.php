<?php

use App\Models\City;
use App\Models\Lead;
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
    $this->supportAgentRole = Role::firstOrCreate(['name' => 'support-agent']);
    Role::firstOrCreate(['name' => 'sales-rep']);

    // Create permissions
    $viewLeads = Permission::firstOrCreate(['name' => 'view leads']);
    $editLeads = Permission::firstOrCreate(['name' => 'edit leads']);
    $viewAssignedLeads = Permission::firstOrCreate(['name' => 'view assigned leads']);
    $this->supportAgentRole->givePermissionTo([$viewLeads, $editLeads, $viewAssignedLeads]);

    // Create city, zone, and service
    $this->city = City::factory()->create(['name' => 'Dubai']);
    $this->zone = Zone::factory()->create(['name' => 'UAE Zone']);
    $this->zone->cities()->attach($this->city);
    $this->service = Service::create([
        'name' => 'Golden Visa',
        'detail' => 'Golden Visa service',
        'sort_order' => 1,
        'status' => 'active',
    ]);

    // Create CRO
    $this->cro = User::factory()->create([
        'email_verified_at' => now(),
        'availability' => true,
        'active' => true,
    ]);
    $this->cro->assignRole($this->supportAgentRole);
});

it('blocks qualification when lead has no city', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'contacted',
        'city' => null,
        'service_id' => $this->service->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson("/leads/{$lead->id}", ['inquiry_status' => 'qualified'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('city');

    // Lead should remain in original status
    expect($lead->fresh()->inquiry_status)->toBe('contacted');
});

it('blocks qualification when lead has no service', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'contacted',
        'city' => $this->city->name,
        'service_id' => null,
    ]);

    $this->actingAs($this->cro)
        ->putJson("/leads/{$lead->id}", ['inquiry_status' => 'qualified'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('service_id');

    // Lead should remain in original status
    expect($lead->fresh()->inquiry_status)->toBe('contacted');
});

it('blocks qualification when no advisor matches service and city/zone', function () {
    // No advisors set up with matching zone/service
    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'contacted',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson("/leads/{$lead->id}", ['inquiry_status' => 'qualified'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('inquiry_status');

    // Lead should remain in original status
    expect($lead->fresh()->inquiry_status)->toBe('contacted');
});

it('allows qualification when matching advisor exists', function () {
    // Create an advisor with matching zone and service
    $advisor = User::factory()->create([
        'email_verified_at' => now(),
        'availability' => true,
        'active' => true,
        'zone_id' => $this->zone->id,
        'current_lead_count' => 0,
    ]);
    $advisor->assignRole('sales-rep');
    $this->service->assignToUser($advisor);

    $lead = Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'contacted',
        'city' => $this->city->name,
        'service_id' => $this->service->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson("/leads/{$lead->id}", ['inquiry_status' => 'qualified'])
        ->assertOk();

    $lead->refresh();
    expect($lead->assigned_to)->toBe($advisor->id)
        ->and($lead->inquiry_status)->toBe('assigned_to_advisor');
});
