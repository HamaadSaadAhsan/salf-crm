<?php

use App\Models\Lead;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'view dashboard', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->givePermissionTo('view dashboard');
    $this->actingAs($user);

    $this->get('/dashboard')->assertOk();
});

test('authenticated users can fetch leads overview data', function () {
    // Create role
    Role::create(['name' => 'super-admin', 'guard_name' => 'web']);

    $user = User::factory()->create();
    $user->assignRole('super-admin');

    // Create some test leads
    Lead::factory()->count(10)->create();

    $this->actingAs($user)
        ->getJson('/api/dashboard/leads-overview')
        ->assertSuccessful()
        ->assertJsonStructure([
            'chart_data' => [
                '*' => ['period', 'deals'],
            ],
            'statistics' => [
                'closed_deals',
                'closed_deals_change',
                'pipeline_value',
                'pipeline_value_formatted',
                'pipeline_change',
                'conversion_rate',
                'conversion_change',
            ],
        ]);
});

test('leads overview endpoint accepts different periods', function ($period) {
    // Create role
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $this->actingAs($user)
        ->getJson("/api/dashboard/leads-overview?period={$period}")
        ->assertSuccessful()
        ->assertJsonStructure([
            'chart_data',
            'statistics',
        ]);
})->with(['day', 'week', 'month', 'year']);

test('authenticated users can fetch lead analytics data', function () {
    // Create role
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    $user = User::factory()->create();
    $user->assignRole('super-admin');

    // Create some test leads
    Lead::factory()->count(15)->create();

    $this->actingAs($user)
        ->getJson('/api/dashboard/lead-analytics')
        ->assertSuccessful()
        ->assertJsonStructure([
            'chart_data' => [
                '*' => ['period', 'leads'],
            ],
            'total_leads',
            'growth_percentage',
        ]);
});

test('lead analytics endpoint accepts different periods', function ($period) {
    // Create role
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $this->actingAs($user)
        ->getJson("/api/dashboard/lead-analytics?period={$period}")
        ->assertSuccessful()
        ->assertJsonStructure([
            'chart_data',
            'total_leads',
            'growth_percentage',
        ]);
})->with(['5D', '2W', '1M', '6M']);

test('dashboard endpoints require authentication', function ($endpoint) {
    $this->getJson($endpoint)
        ->assertUnauthorized();
})->with([
    '/api/dashboard/leads-overview',
    '/api/dashboard/lead-analytics',
]);
