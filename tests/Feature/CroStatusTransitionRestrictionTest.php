<?php

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Disable broadcasting
    config(['broadcasting.default' => 'null']);

    // Create necessary roles
    $supportAgentRole = Role::create(['name' => 'support-agent']);
    $salesRepRole = Role::create(['name' => 'sales-rep']);
    $adminRole = Role::create(['name' => 'admin']);

    // Create 'edit leads' permission and assign to roles
    $editLeadsPermission = Permission::create(['name' => 'edit leads']);
    $supportAgentRole->givePermissionTo($editLeadsPermission);
    $salesRepRole->givePermissionTo($editLeadsPermission);
    $adminRole->givePermissionTo($editLeadsPermission);

    // Create a CRO user
    $this->cro = User::factory()->create([
        'availability' => true,
        'active' => true,
    ]);
    $this->cro->assignRole($supportAgentRole);

    // Create an admin user
    $this->admin = User::factory()->create([
        'availability' => true,
        'active' => true,
    ]);
    $this->admin->assignRole($adminRole);

    // Create an advisor
    $this->advisor = User::factory()->create([
        'availability' => true,
        'active' => true,
    ]);
    $this->advisor->assignRole($salesRepRole);
});

describe('CRO status transition restrictions when lead is assigned to advisor', function () {
    it('allows CRO to change status to requalify', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'requalify',
                'requalify_reason' => 'Needs further review',
            ]);

        $response->assertSuccessful();
        expect($lead->fresh()->inquiry_status)->toBe('requalify');
    });

    it('allows CRO to change status to won', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'won',
            ]);

        $response->assertSuccessful();
        expect($lead->fresh()->inquiry_status)->toBe('won');
    });

    it('allows CRO to change status to lost', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'lost',
                'loss_reason' => 'Client not interested',
            ]);

        $response->assertSuccessful();
        expect($lead->fresh()->inquiry_status)->toBe('lost');
    });

    it('prevents CRO from changing status to contacted', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'contacted',
            ]);

        $response->assertForbidden();
        expect($lead->fresh()->inquiry_status)->toBe('assigned_to_advisor');
    });

    it('prevents CRO from changing status to qualified', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'qualified',
            ]);

        $response->assertForbidden();
        expect($lead->fresh()->inquiry_status)->toBe('assigned_to_advisor');
    });

    it('prevents CRO from changing status to new', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'new',
            ]);

        $response->assertForbidden();
        expect($lead->fresh()->inquiry_status)->toBe('assigned_to_advisor');
    });

    it('prevents CRO from editing lead details when assigned to advisor', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
            'name' => 'Original Name',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'name' => 'Updated Name',
            ]);

        $response->assertForbidden();
        expect($lead->fresh()->name)->toBe('Original Name');
    });

    it('prevents CRO from updating email when assigned to advisor', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
            'email' => 'original@example.com',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'email' => 'updated@example.com',
            ]);

        $response->assertForbidden();
        expect($lead->fresh()->email)->toBe('original@example.com');
    });

    it('prevents CRO from updating priority when assigned to advisor', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
            'priority' => 'low',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'priority' => 'high',
            ]);

        $response->assertForbidden();
        expect($lead->fresh()->priority)->toBe('low');
    });

    it('prevents CRO from sneaking other fields along with status change', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
            'name' => 'Original Name',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'won',
                'name' => 'Sneaky Update',
            ]);

        $response->assertForbidden();
        $lead->refresh();
        expect($lead->name)->toBe('Original Name')
            ->and($lead->inquiry_status)->toBe('assigned_to_advisor');
    });
});

describe('Admin can edit leads assigned to advisor', function () {
    it('allows admin to change status to any value', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'contacted',
            ]);

        $response->assertSuccessful();
        expect($lead->fresh()->inquiry_status)->toBe('contacted');
    });

    it('allows admin to edit lead details when assigned to advisor', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->advisor->id,
            'inquiry_status' => 'assigned_to_advisor',
            'name' => 'Original Name',
        ]);

        $response = $this->actingAs($this->admin)
            ->putJson("/leads/{$lead->id}", [
                'name' => 'Updated Name',
            ]);

        $response->assertSuccessful();
        expect($lead->fresh()->name)->toBe('Updated Name');
    });
});

describe('CRO can edit leads not assigned to advisor', function () {
    it('allows CRO to edit lead details when not assigned to advisor', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->cro->id,
            'inquiry_status' => 'assigned_to_cro',
            'name' => 'Original Name',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'name' => 'Updated Name',
            ]);

        $response->assertSuccessful();
        expect($lead->fresh()->name)->toBe('Updated Name');
    });

    it('allows CRO to change status to any valid value when not assigned to advisor', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->cro->id,
            'inquiry_status' => 'new',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'inquiry_status' => 'contacted',
            ]);

        $response->assertSuccessful();
        expect($lead->fresh()->inquiry_status)->toBe('contacted');
    });

    it('allows CRO to update priority when not assigned to advisor', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => $this->cro->id,
            'inquiry_status' => 'assigned_to_cro',
            'priority' => 'low',
        ]);

        $response = $this->actingAs($this->cro)
            ->putJson("/leads/{$lead->id}", [
                'priority' => 'urgent',
            ]);

        $response->assertSuccessful();
        expect($lead->fresh()->priority)->toBe('urgent');
    });
});
