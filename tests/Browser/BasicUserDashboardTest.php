<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\seed;

it('displays basic dashboard for users without specific roles', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $customerRole = Role::where('name', 'customer')->first();
    $basicUser = User::factory()->create([
        'email' => 'customer@test.com',
        'name' => 'Customer User',
    ]);
    $basicUser->assignRole($customerRole);

    $page = $this->actingAs($basicUser)->visit('/dashboard');

    $page->assertNoJavascriptErrors()
        ->assertSee('Dashboard');
});

it('basic user sees pending tasks', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $customerRole = Role::where('name', 'customer')->first();
    $basicUser = User::factory()->create();
    $basicUser->assignRole($customerRole);

    $page = $this->actingAs($basicUser)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('basic user cannot access advanced metrics', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $customerRole = Role::where('name', 'customer')->first();
    $basicUser = User::factory()->create();
    $basicUser->assignRole($customerRole);

    $response = $this->actingAs($basicUser)->getJson('/api/dashboard/overview');
    $response->assertSuccessful();

    expect($response->json('role'))->not->toBe('super-admin');
    expect($response->json('role'))->not->toBe('manager');
    expect($response->json('role'))->not->toBe('cro');
    expect($response->json('role'))->not->toBe('advisor');
});

it('user without any role gets basic dashboard', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $basicUser = User::factory()->create([
        'email' => 'norole@test.com',
    ]);

    $page = $this->actingAs($basicUser)->visit('/dashboard');

    $page->assertNoJavascriptErrors();

    $page->assertSee('Dashboard');
});

it('basic dashboard is simple and task-focused', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $customerRole = Role::where('name', 'customer')->first();
    $basicUser = User::factory()->create();
    $basicUser->assignRole($customerRole);

    $page = $this->actingAs($basicUser)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('basic dashboard loads quickly without heavy metrics', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $customerRole = Role::where('name', 'customer')->first();
    $basicUser = User::factory()->create();
    $basicUser->assignRole($customerRole);

    $page = $this->actingAs($basicUser)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('basic dashboard is responsive on mobile', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $customerRole = Role::where('name', 'customer')->first();
    $basicUser = User::factory()->create();
    $basicUser->assignRole($customerRole);

    $page = $this->actingAs($basicUser)
        ->visit('/dashboard')
        ->on()
        ->mobile();

    $page->assertNoJavascriptErrors();
});

it('basic dashboard shows in-progress tasks', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $customerRole = Role::where('name', 'customer')->first();
    $basicUser = User::factory()->create();
    $basicUser->assignRole($customerRole);

    $page = $this->actingAs($basicUser)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});
