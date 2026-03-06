<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    Permission::create(['name' => 'view leads']);
    Permission::create(['name' => 'create leads']);
    Permission::create(['name' => 'view dashboard']);

    $fdo = Role::create(['name' => 'fdo']);
    $fdo->syncPermissions(['view dashboard', 'view leads', 'create leads']);

    $salesRep = Role::create(['name' => 'sales-rep']);
    $salesRep->syncPermissions(['view dashboard', 'view leads']);

    $supportAgent = Role::create(['name' => 'support-agent']);
    $supportAgent->syncPermissions(['view dashboard', 'view leads']);

    $superAdmin = Role::create(['name' => 'super-admin']);
    $superAdmin->syncPermissions(Permission::all());
});

it('fdo user can create a lead', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('fdo');

    $this->actingAs($user)
        ->post(route('leads.store'), ['name' => 'FDO Lead'])
        ->assertRedirect();

    $this->assertDatabaseHas('leads', ['name' => 'FDO Lead']);
});

it('super-admin can create a lead', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    $this->actingAs($user)
        ->post(route('leads.store'), ['name' => 'Admin Lead'])
        ->assertRedirect();

    $this->assertDatabaseHas('leads', ['name' => 'Admin Lead']);
});

it('sales-rep cannot create a lead', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('sales-rep');

    $this->actingAs($user)
        ->post(route('leads.store'), ['name' => 'Unauthorized Lead'])
        ->assertForbidden();

    $this->assertDatabaseMissing('leads', ['name' => 'Unauthorized Lead']);
});

it('support-agent cannot create a lead', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('support-agent');

    $this->actingAs($user)
        ->post(route('leads.store'), ['name' => 'Unauthorized Lead'])
        ->assertForbidden();

    $this->assertDatabaseMissing('leads', ['name' => 'Unauthorized Lead']);
});

it('unauthenticated user cannot create a lead', function () {
    $this->post(route('leads.store'), ['name' => 'Guest Lead'])
        ->assertRedirect(route('login'));
});
