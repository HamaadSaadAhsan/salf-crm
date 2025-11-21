<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create all necessary roles
    Role::create(['name' => 'super-admin']);
    Role::create(['name' => 'admin']);
    Role::create(['name' => 'manager']);
    Role::create(['name' => 'team-lead']);
    Role::create(['name' => 'support-agent']);
    Role::create(['name' => 'senior-support-agent']);
    Role::create(['name' => 'sales-rep']);
    Role::create(['name' => 'senior-sales-rep']);
    Role::create(['name' => 'customer']);
});

test('authenticated users can access dashboard overview', function () {
    $user = User::factory()->create();
    $user->assignRole('sales-rep');

    // Ensure user has roles loaded to avoid extra queries
    $user->load('roles');

    $response = $this->actingAs($user)->getJson('/api/dashboard/overview');

    if ($response->status() !== 200) {
        dump($response->json());
    }

    $response->assertSuccessful();
    $response->assertJsonStructure([
        'role',
        'my_leads',
        'my_tasks',
        'my_performance',
    ]);
});

test('unauthenticated users cannot access dashboard', function () {
    $response = $this->getJson('/api/dashboard/overview');

    $response->assertUnauthorized();
});

test('super admin can access all metrics', function () {
    $admin = User::factory()->create();
    $admin->assignRole('super-admin');

    $response = $this->actingAs($admin)->getJson('/api/metrics/conversion');

    $response->assertSuccessful();
});

test('admin can access all metrics', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin');

    $response = $this->actingAs($admin)->getJson('/api/metrics/conversion');

    $response->assertSuccessful();
});

test('manager can access department metrics', function () {
    $manager = User::factory()->create();
    $manager->assignRole('manager');

    $response = $this->actingAs($manager)->getJson('/api/metrics/business-performance');

    $response->assertSuccessful();
});

test('team lead can access department metrics', function () {
    $teamLead = User::factory()->create();
    $teamLead->assignRole('team-lead');

    $response = $this->actingAs($teamLead)->getJson('/api/metrics/business-performance');

    $response->assertSuccessful();
});

test('cro can access their own metrics', function () {
    $cro = User::factory()->create();
    $cro->assignRole('support-agent');

    $response = $this->actingAs($cro)->getJson('/api/metrics/user-performance');

    $response->assertSuccessful();
});

test('advisor can access their own metrics', function () {
    $advisor = User::factory()->create();
    $advisor->assignRole('sales-rep');

    $response = $this->actingAs($advisor)->getJson('/api/metrics/user-performance');

    $response->assertSuccessful();
});

test('basic users cannot access system-wide metrics', function () {
    $user = User::factory()->create();
    $user->assignRole('customer');

    $response = $this->actingAs($user)->getJson('/api/metrics/conversion');

    $response->assertForbidden();
});

test('dashboard overview returns role-appropriate data for super admin', function () {
    $admin = User::factory()->create();
    $admin->assignRole('super-admin');

    $response = $this->actingAs($admin)->getJson('/api/dashboard/overview');

    $response->assertSuccessful();
    $response->assertJsonStructure([
        'kpis',
        'recent_activity',
        'response_times',
    ]);
});

test('dashboard overview returns role-appropriate data for cro', function () {
    $cro = User::factory()->create();
    $cro->assignRole('support-agent');

    $response = $this->actingAs($cro)->getJson('/api/dashboard/overview');

    $response->assertSuccessful();
    $response->assertJsonStructure([
        'my_leads',
        'my_tasks',
        'my_performance',
        'hot_leads',
    ]);
});

test('dashboard overview returns role-appropriate data for advisor', function () {
    $advisor = User::factory()->create();
    $advisor->assignRole('sales-rep');

    $response = $this->actingAs($advisor)->getJson('/api/dashboard/overview');

    $response->assertSuccessful();
    $response->assertJsonStructure([
        'my_leads',
        'my_tasks',
        'my_performance',
        'upcoming_meetings',
    ]);
});

test('dashboard overview returns role-appropriate data for manager', function () {
    $manager = User::factory()->create();
    $manager->assignRole('manager');

    $response = $this->actingAs($manager)->getJson('/api/dashboard/overview');

    $response->assertSuccessful();
    $response->assertJsonStructure([
        'kpis',
        'team_performance',
        'response_times',
    ]);
});

test('conversion metrics endpoint requires authentication', function () {
    $response = $this->getJson('/api/metrics/conversion');

    $response->assertUnauthorized();
});

test('business performance metrics endpoint requires proper authorization', function () {
    $user = User::factory()->create();
    $user->assignRole('customer');

    $response = $this->actingAs($user)->getJson('/api/metrics/business-performance');

    $response->assertForbidden();
});

test('user performance metrics are filtered by user for non-admin roles', function () {
    $cro = User::factory()->create();
    $cro->assignRole('support-agent');

    $response = $this->actingAs($cro)->getJson('/api/metrics/user-performance');

    $response->assertSuccessful();
    // Should only return data for the authenticated user
    $response->assertJson([]);
});

test('department handoff metrics require department level access', function () {
    $user = User::factory()->create();
    $user->assignRole('customer');

    $response = $this->actingAs($user)->getJson('/api/metrics/department-handoff');

    $response->assertForbidden();
});

test('system adoption metrics require admin access', function () {
    $cro = User::factory()->create();
    $cro->assignRole('support-agent');

    $response = $this->actingAs($cro)->getJson('/api/metrics/system-adoption');

    $response->assertForbidden();
});

test('admin can access system adoption metrics', function () {
    $admin = User::factory()->create();
    $admin->assignRole('super-admin');

    $response = $this->actingAs($admin)->getJson('/api/metrics/system-adoption');

    $response->assertSuccessful();
});
