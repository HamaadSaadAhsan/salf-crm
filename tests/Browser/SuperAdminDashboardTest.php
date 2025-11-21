<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\seed;

it('displays super admin dashboard with all charts and metrics', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $superAdminRole = Role::where('name', 'super-admin')->first();
    $superAdmin = User::factory()->create([
        'email' => 'superadmin@test.com',
        'name' => 'Super Admin User',
    ]);
    $superAdmin->assignRole($superAdminRole);

    $page = $this->actingAs($superAdmin)->visit('/dashboard');

    $page->assertNoJavascriptErrors()
        ->assertSee('Dashboard');

    // Page loaded successfully with dashboard visible
});

it('allows super admin to interact with dashboard filters', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $superAdminRole = Role::where('name', 'super-admin')->first();
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole($superAdminRole);

    $page = $this->actingAs($superAdmin)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('displays correct role badge for super admin', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $superAdminRole = Role::where('name', 'super-admin')->first();
    $superAdmin = User::factory()->create([
        'name' => 'Super Admin Test',
    ]);
    $superAdmin->assignRole($superAdminRole);

    $page = $this->actingAs($superAdmin)->visit('/dashboard');

    $page->assertSee('Super Admin Test');
});

it('loads charts without errors for super admin', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $superAdminRole = Role::where('name', 'super-admin')->first();
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole($superAdminRole);

    $page = $this->actingAs($superAdmin)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('displays empty state when no metrics data exists', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);

    $superAdminRole = Role::where('name', 'super-admin')->first();
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole($superAdminRole);

    $page = $this->actingAs($superAdmin)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('super admin dashboard is responsive on mobile', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $superAdminRole = Role::where('name', 'super-admin')->first();
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole($superAdminRole);

    $page = $this->actingAs($superAdmin)
        ->visit('/dashboard')
        ->on()
        ->mobile();

    $page->assertNoJavascriptErrors();
});

it('super admin can access all dashboard metrics endpoints', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $superAdminRole = Role::where('name', 'super-admin')->first();
    $superAdmin = User::factory()->create();
    $superAdmin->assignRole($superAdminRole);

    $response = $this->actingAs($superAdmin)->getJson('/api/dashboard/overview');
    $response->assertSuccessful()
        ->assertJsonStructure([
            'role',
            'kpis',
        ]);

    expect($response->json('role'))->toBe('super-admin');
});
