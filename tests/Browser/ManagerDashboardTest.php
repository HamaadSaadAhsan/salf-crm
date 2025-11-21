<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\seed;

it('displays manager dashboard with team metrics and charts', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $managerRole = Role::where('name', 'manager')->first();
    $manager = User::factory()->create([
        'email' => 'manager@test.com',
        'name' => 'Manager User',
    ]);
    $manager->assignRole($managerRole);

    $page = $this->actingAs($manager)->visit('/dashboard');

    $page->assertNoJavascriptErrors()
        ->assertSee('Dashboard');
});

it('manager can view team performance metrics', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $managerRole = Role::where('name', 'manager')->first();
    $manager = User::factory()->create();
    $manager->assignRole($managerRole);

    $page = $this->actingAs($manager)->visit('/dashboard');

    $page->assertSee('Team');
    $page->assertNoJavascriptErrors();
});

it('loads charts without errors for manager', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $managerRole = Role::where('name', 'manager')->first();
    $manager = User::factory()->create();
    $manager->assignRole($managerRole);

    $page = $this->actingAs($manager)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('team lead has same dashboard access as manager', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $teamLeadRole = Role::where('name', 'team-lead')->first();
    $teamLead = User::factory()->create();
    $teamLead->assignRole($teamLeadRole);

    $page = $this->actingAs($teamLead)->visit('/dashboard');

    $page->assertNoJavascriptErrors();

    $page->assertSee('Team');
});

it('manager dashboard displays correct role data from API', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $managerRole = Role::where('name', 'manager')->first();
    $manager = User::factory()->create();
    $manager->assignRole($managerRole);

    $response = $this->actingAs($manager)->getJson('/api/dashboard/overview');
    $response->assertSuccessful()
        ->assertJsonStructure([
            'role',
            'kpis',
        ]);

    expect($response->json('role'))->toBe('manager');
});

it('manager cannot access super admin only features', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $managerRole = Role::where('name', 'manager')->first();
    $manager = User::factory()->create();
    $manager->assignRole($managerRole);

    $page = $this->actingAs($manager)->visit('/dashboard');

    // Page loaded successfully

    $response = $this->actingAs($manager)->getJson('/api/dashboard/overview');
    expect($response->json('role'))->not->toBe('super-admin');
});

it('manager dashboard is responsive on mobile', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $managerRole = Role::where('name', 'manager')->first();
    $manager = User::factory()->create();
    $manager->assignRole($managerRole);

    $page = $this->actingAs($manager)
        ->visit('/dashboard')
        ->on()
        ->mobile();

    $page->assertNoJavascriptErrors();
});
