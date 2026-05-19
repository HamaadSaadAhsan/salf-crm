<?php

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    // Create roles
    $this->supportAgentRole = Role::firstOrCreate(['name' => 'support-agent']);
    $this->seniorSupportAgentRole = Role::firstOrCreate(['name' => 'senior-support-agent']);
    $this->salesRepRole = Role::firstOrCreate(['name' => 'sales-rep']);
    $this->seniorSalesRepRole = Role::firstOrCreate(['name' => 'senior-sales-rep']);
    $this->superAdminRole = Role::firstOrCreate(['name' => 'super-admin']);

    // Create permissions (firstOrCreate since migration may have pre-created some)
    $manageTeamAgents = Permission::firstOrCreate(['name' => 'manage team agents']);
    $viewUsers = Permission::firstOrCreate(['name' => 'view users']);
    $viewLeads = Permission::firstOrCreate(['name' => 'view leads']);
    $editLeads = Permission::firstOrCreate(['name' => 'edit leads']);
    $viewAssignedLeads = Permission::firstOrCreate(['name' => 'view assigned leads']);

    // Assign permissions to roles
    $this->supportAgentRole->givePermissionTo([$viewLeads, $editLeads, $viewAssignedLeads]);
    $this->salesRepRole->givePermissionTo([$viewLeads, $editLeads, $viewAssignedLeads]);

    $this->seniorSupportAgentRole->givePermissionTo([
        $viewLeads, $editLeads, $viewAssignedLeads, $manageTeamAgents, $viewUsers,
    ]);
    $this->seniorSalesRepRole->givePermissionTo([
        $viewLeads, $editLeads, $viewAssignedLeads, $manageTeamAgents, $viewUsers,
    ]);

    // Create users
    $this->seniorSupportAgent = User::factory()->create(['email_verified_at' => now()]);
    $this->seniorSupportAgent->assignRole('senior-support-agent');

    $this->supportAgent = User::factory()->create(['email_verified_at' => now(), 'availability' => true]);
    $this->supportAgent->assignRole('support-agent');

    $this->seniorSalesRep = User::factory()->create(['email_verified_at' => now()]);
    $this->seniorSalesRep->assignRole('senior-sales-rep');

    $this->salesRep = User::factory()->create(['email_verified_at' => now(), 'availability' => true]);
    $this->salesRep->assignRole('sales-rep');

    $this->otherUser = User::factory()->create(['email_verified_at' => now()]);
    $this->otherUser->assignRole('super-admin');
});

// =====================================================
// SENIOR SUPPORT AGENT — USER MANAGEMENT
// =====================================================

it('senior-support-agent can access /users page', function () {
    $this->actingAs($this->seniorSupportAgent)
        ->get('/users')
        ->assertOk();
});

it('senior-support-agent can view a support-agent user detail page', function () {
    $this->actingAs($this->seniorSupportAgent)
        ->get("/users/{$this->supportAgent->id}")
        ->assertOk();
});

it('senior-support-agent gets 403 viewing a non-support-agent user', function () {
    $this->actingAs($this->seniorSupportAgent)
        ->get("/users/{$this->otherUser->id}")
        ->assertForbidden();
});

it('senior-support-agent can toggle support-agent availability', function () {
    $this->actingAs($this->seniorSupportAgent)
        ->patchJson("/api/users/{$this->supportAgent->id}/availability", ['availability' => false])
        ->assertOk();
});

it('senior-support-agent gets 403 toggling non-support-agent availability', function () {
    $this->actingAs($this->seniorSupportAgent)
        ->patchJson("/api/users/{$this->otherUser->id}/availability", ['availability' => false])
        ->assertForbidden();
});

it('senior-support-agent cannot access permissions endpoint', function () {
    $this->actingAs($this->seniorSupportAgent)
        ->patchJson("/api/users/{$this->supportAgent->id}/permissions", ['permission_ids' => []])
        ->assertForbidden();
});

it('senior-support-agent cannot delete a user', function () {
    $this->actingAs($this->seniorSupportAgent)
        ->deleteJson("/api/users/{$this->supportAgent->id}")
        ->assertForbidden();
});

// =====================================================
// SENIOR SUPPORT AGENT — LEAD MANAGEMENT
// =====================================================

it('senior-support-agent can view a lead assigned to a support-agent', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->supportAgent->id]);

    $this->actingAs($this->seniorSupportAgent)
        ->get("/leads/{$lead->id}/overview")
        ->assertOk();
});

it('senior-support-agent can view their own assigned lead', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->seniorSupportAgent->id]);

    $this->actingAs($this->seniorSupportAgent)
        ->get("/leads/{$lead->id}/overview")
        ->assertOk();
});

it('senior-support-agent gets 403 viewing a lead assigned to a non-team-member', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->salesRep->id]);

    $this->actingAs($this->seniorSupportAgent)
        ->get("/leads/{$lead->id}/overview")
        ->assertForbidden();
});

it('senior-support-agent can reassign a support-agent lead', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->supportAgent->id]);

    $this->actingAs($this->seniorSupportAgent)
        ->putJson("/leads/{$lead->id}", ['assigned_to' => $this->seniorSupportAgent->id])
        ->assertOk();
});

it('senior-support-agent gets 403 reassigning a lead not belonging to a team member', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->salesRep->id]);

    $this->actingAs($this->seniorSupportAgent)
        ->putJson("/leads/{$lead->id}", ['assigned_to' => $this->seniorSupportAgent->id])
        ->assertForbidden();
});

// =====================================================
// SENIOR SALES REP — USER MANAGEMENT
// =====================================================

it('senior-sales-rep can access /users page', function () {
    $this->actingAs($this->seniorSalesRep)
        ->get('/users')
        ->assertOk();
});

it('senior-sales-rep can view a sales-rep user detail page', function () {
    $this->actingAs($this->seniorSalesRep)
        ->get("/users/{$this->salesRep->id}")
        ->assertOk();
});

it('senior-sales-rep gets 403 viewing a non-sales-rep user', function () {
    $this->actingAs($this->seniorSalesRep)
        ->get("/users/{$this->otherUser->id}")
        ->assertForbidden();
});

it('senior-sales-rep can toggle sales-rep availability', function () {
    $this->actingAs($this->seniorSalesRep)
        ->patchJson("/api/users/{$this->salesRep->id}/availability", ['availability' => false])
        ->assertOk();
});

it('senior-sales-rep gets 403 toggling non-sales-rep availability', function () {
    $this->actingAs($this->seniorSalesRep)
        ->patchJson("/api/users/{$this->otherUser->id}/availability", ['availability' => false])
        ->assertForbidden();
});

it('senior-sales-rep cannot access permissions endpoint', function () {
    $this->actingAs($this->seniorSalesRep)
        ->patchJson("/api/users/{$this->salesRep->id}/permissions", ['permission_ids' => []])
        ->assertForbidden();
});

it('senior-sales-rep cannot delete a user', function () {
    $this->actingAs($this->seniorSalesRep)
        ->deleteJson("/api/users/{$this->salesRep->id}")
        ->assertForbidden();
});

// =====================================================
// SENIOR SALES REP — LEAD MANAGEMENT
// =====================================================

it('senior-sales-rep can view a lead assigned to a sales-rep', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->salesRep->id]);

    $this->actingAs($this->seniorSalesRep)
        ->get("/leads/{$lead->id}/overview")
        ->assertOk();
});

it('senior-sales-rep gets 403 viewing a lead assigned to a non-team-member', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->supportAgent->id]);

    $this->actingAs($this->seniorSalesRep)
        ->get("/leads/{$lead->id}/overview")
        ->assertForbidden();
});

it('senior-sales-rep can reassign a sales-rep lead', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->salesRep->id]);

    $this->actingAs($this->seniorSalesRep)
        ->putJson("/leads/{$lead->id}", ['assigned_to' => $this->seniorSalesRep->id])
        ->assertOk();
});

it('senior-sales-rep gets 403 reassigning a lead not belonging to a team member', function () {
    $lead = Lead::factory()->create(['assigned_to' => $this->supportAgent->id]);

    $this->actingAs($this->seniorSalesRep)
        ->putJson("/leads/{$lead->id}", ['assigned_to' => $this->seniorSalesRep->id])
        ->assertForbidden();
});
