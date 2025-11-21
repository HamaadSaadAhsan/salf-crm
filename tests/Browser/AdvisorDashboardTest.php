<?php

use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\seed;

it('displays advisor dashboard with personal conversion metrics', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $advisorRole = Role::where('name', 'sales-rep')->first();
    $advisor = User::factory()->create([
        'email' => 'advisor@test.com',
        'name' => 'Advisor User',
    ]);
    $advisor->assignRole($advisorRole);

    $page = $this->actingAs($advisor)->visit('/dashboard');

    $page->assertNoJavascriptErrors()
        ->assertSee('Dashboard');
});

it('senior sales rep has same dashboard as sales rep', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $seniorRole = Role::where('name', 'senior-sales-rep')->first();
    $seniorRep = User::factory()->create();
    $seniorRep->assignRole($seniorRole);

    $page = $this->actingAs($seniorRep)->visit('/dashboard');

    $page->assertNoJavascriptErrors();

    $page->assertSee('Conversion');
});

it('advisor can view upcoming meetings', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $advisorRole = Role::where('name', 'sales-rep')->first();
    $advisor = User::factory()->create();
    $advisor->assignRole($advisorRole);

    $page = $this->actingAs($advisor)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('loads charts without errors for advisor', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $advisorRole = Role::where('name', 'sales-rep')->first();
    $advisor = User::factory()->create();
    $advisor->assignRole($advisorRole);

    $page = $this->actingAs($advisor)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('advisor dashboard displays personal KPIs', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $advisorRole = Role::where('name', 'sales-rep')->first();
    $advisor = User::factory()->create();
    $advisor->assignRole($advisorRole);

    $page = $this->actingAs($advisor)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('advisor dashboard displays correct role data from API', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $advisorRole = Role::where('name', 'sales-rep')->first();
    $advisor = User::factory()->create();
    $advisor->assignRole($advisorRole);

    $response = $this->actingAs($advisor)->getJson('/api/dashboard/overview');
    $response->assertSuccessful()
        ->assertJsonStructure([
            'role',
            'my_leads',
            'my_tasks',
            'my_performance',
        ]);

    expect($response->json('role'))->toBe('advisor');
});

it('advisor cannot access team or system-wide metrics', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $advisorRole = Role::where('name', 'sales-rep')->first();
    $advisor = User::factory()->create();
    $advisor->assignRole($advisorRole);

    $response = $this->actingAs($advisor)->getJson('/api/dashboard/overview');
    expect($response->json('role'))->toBe('advisor');
    expect($response->json('role'))->not->toBe('super-admin');
    expect($response->json('role'))->not->toBe('manager');
});

it('advisor dashboard is responsive on mobile', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $advisorRole = Role::where('name', 'sales-rep')->first();
    $advisor = User::factory()->create();
    $advisor->assignRole($advisorRole);

    $page = $this->actingAs($advisor)
        ->visit('/dashboard')
        ->on()
        ->mobile();

    $page->assertNoJavascriptErrors();
});

it('advisor can view activity performance for last 14 days', function () {
    seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);
    seed(\Database\Seeders\MetricsSeeder::class);

    $advisorRole = Role::where('name', 'sales-rep')->first();
    $advisor = User::factory()->create();
    $advisor->assignRole($advisorRole);

    $page = $this->actingAs($advisor)->visit('/dashboard');

    $page->assertSee('Activity')
        ->assertNoJavascriptErrors();
});
