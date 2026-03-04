<?php

use App\Models\Lead;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    config(['broadcasting.default' => 'log']);

    // Create processing role with read-only permissions
    $role = Role::firstOrCreate(['name' => 'processing', 'guard_name' => 'web']);
    $permissions = [
        'view dashboard',
        'view leads',
        'view lead notes',
        'view lead timeline',
        'view lead pipeline',
        'view files',
        'view tasks',
    ];
    foreach ($permissions as $perm) {
        Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
    }
    $role->syncPermissions($permissions);

    // Also create edit-related permissions so we can verify they're absent
    foreach (['edit leads', 'add lead notes', 'create tasks'] as $perm) {
        Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
    }

    $this->processingUser = User::factory()->create(['email_verified_at' => now()]);
    $this->processingUser->assignRole('processing');
});

it('returns processing dashboard for processing user', function () {
    Lead::factory()->create(['advisor_stage' => 'meeting']);
    Lead::factory()->create(['advisor_stage' => 'meeting']);
    Lead::factory()->create(['advisor_stage' => 'contract_signed']);
    Lead::factory()->create(['advisor_stage' => 'contacted']); // not visible

    $response = $this->actingAs($this->processingUser)
        ->getJson('/api/dashboard/overview');

    $response->assertSuccessful();
    $data = $response->json();

    expect($data['role'])->toBe('processing');
    expect($data['leads_to_process'])->toBeArray();
    expect($data['leads_to_process']['total'])->toBe(3);
    expect($data['leads_to_process']['by_stage']['meeting'])->toBe(2);
    expect($data['leads_to_process']['by_stage']['contract_signed'])->toBe(1);
});

it('allows processing user to view leads list', function () {
    Lead::factory()->create(['advisor_stage' => 'meeting']);
    Lead::factory()->create(['advisor_stage' => 'contacted']); // not visible

    $response = $this->actingAs($this->processingUser)
        ->get('/leads');

    $response->assertSuccessful();
});

it('allows processing user to view a lead at configured stage', function () {
    $lead = Lead::factory()->create(['advisor_stage' => 'meeting']);

    $response = $this->actingAs($this->processingUser)
        ->get("/leads/{$lead->id}/overview");

    $response->assertSuccessful();
});

it('denies processing user access to leads outside configured stages', function () {
    $lead = Lead::factory()->create(['advisor_stage' => 'contacted']);

    $response = $this->actingAs($this->processingUser)
        ->get("/leads/{$lead->id}/overview");

    $response->assertForbidden();
});

it('denies processing user access to leads with no advisor stage', function () {
    $lead = Lead::factory()->create(['advisor_stage' => null]);

    $response = $this->actingAs($this->processingUser)
        ->get("/leads/{$lead->id}/overview");

    $response->assertForbidden();
});

it('processing user cannot update leads', function () {
    $lead = Lead::factory()->create(['advisor_stage' => 'meeting']);

    $response = $this->actingAs($this->processingUser)
        ->put("/leads/{$lead->id}", [
            'name' => 'Updated Name',
        ]);

    $response->assertForbidden();
});

it('uses configurable advisor stages from config', function () {
    config(['processing.visible_advisor_stages' => ['won']]);

    Lead::factory()->create(['advisor_stage' => 'meeting']); // excluded
    Lead::factory()->create(['advisor_stage' => 'won']); // included

    $response = $this->actingAs($this->processingUser)
        ->getJson('/api/dashboard/overview');

    $response->assertSuccessful();
    expect($response->json('leads_to_process.total'))->toBe(1);
    expect($response->json('leads_to_process.by_stage.won'))->toBe(1);
});

it('processing user does not have edit permissions', function () {
    expect($this->processingUser->hasPermissionTo('edit leads'))->toBeFalse();
    expect($this->processingUser->hasPermissionTo('add lead notes'))->toBeFalse();
    expect($this->processingUser->hasPermissionTo('create tasks'))->toBeFalse();
});
