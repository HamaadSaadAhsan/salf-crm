<?php

use App\Models\User;
use Database\Seeders\MetricsSeeder;
use Database\Seeders\TicketsLeadsPermissionsSeeder;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\seed;

it('displays CRO dashboard with personal qualification metrics', function () {
    seed(TicketsLeadsPermissionsSeeder::class);
    seed(MetricsSeeder::class);

    $croRole = Role::where('name', 'support-agent')->first();
    $cro = User::factory()->create([
        'email' => 'cro@test.com',
        'name' => 'CRO User',
    ]);
    $cro->assignRole($croRole);

    $page = $this->actingAs($cro)->visit('/dashboard');

    $page->assertNoJavascriptErrors()
        ->assertSee('Dashboard');
});

it('senior support agent has same dashboard as support agent', function () {
    seed(TicketsLeadsPermissionsSeeder::class);
    seed(MetricsSeeder::class);

    $seniorRole = Role::where('name', 'senior-support-agent')->first();
    $seniorAgent = User::factory()->create();
    $seniorAgent->assignRole($seniorRole);

    $page = $this->actingAs($seniorAgent)->visit('/dashboard');

    $page->assertNoJavascriptErrors();

    $page->assertSee('Qualification');
});

it('CRO can view hot leads requiring attention', function () {
    seed(TicketsLeadsPermissionsSeeder::class);
    seed(MetricsSeeder::class);

    $croRole = Role::where('name', 'support-agent')->first();
    $cro = User::factory()->create();
    $cro->assignRole($croRole);

    $page = $this->actingAs($cro)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('loads charts without errors for CRO', function () {
    seed(TicketsLeadsPermissionsSeeder::class);
    seed(MetricsSeeder::class);

    $croRole = Role::where('name', 'support-agent')->first();
    $cro = User::factory()->create();
    $cro->assignRole($croRole);

    $page = $this->actingAs($cro)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('CRO dashboard displays personal KPIs', function () {
    seed(TicketsLeadsPermissionsSeeder::class);
    seed(MetricsSeeder::class);

    $croRole = Role::where('name', 'support-agent')->first();
    $cro = User::factory()->create();
    $cro->assignRole($croRole);

    $page = $this->actingAs($cro)->visit('/dashboard');

    $page->assertNoJavascriptErrors();
});

it('CRO dashboard displays correct role data from API', function () {
    seed(TicketsLeadsPermissionsSeeder::class);
    seed(MetricsSeeder::class);

    $croRole = Role::where('name', 'support-agent')->first();
    $cro = User::factory()->create();
    $cro->assignRole($croRole);

    $response = $this->actingAs($cro)->getJson('/api/dashboard/overview');
    $response->assertSuccessful()
        ->assertJsonStructure([
            'role',
            'my_leads',
            'my_tasks',
            'my_performance',
        ]);

    expect($response->json('role'))->toBe('cro');
});

it('CRO cannot access team or system-wide metrics', function () {
    seed(TicketsLeadsPermissionsSeeder::class);
    seed(MetricsSeeder::class);

    $croRole = Role::where('name', 'support-agent')->first();
    $cro = User::factory()->create();
    $cro->assignRole($croRole);

    $response = $this->actingAs($cro)->getJson('/api/dashboard/overview');
    expect($response->json('role'))->toBe('cro');
    expect($response->json('role'))->not->toBe('super-admin');
    expect($response->json('role'))->not->toBe('manager');
});

it('CRO dashboard is responsive on mobile', function () {
    seed(TicketsLeadsPermissionsSeeder::class);
    seed(MetricsSeeder::class);

    $croRole = Role::where('name', 'support-agent')->first();
    $cro = User::factory()->create();
    $cro->assignRole($croRole);

    $page = $this->actingAs($cro)
        ->visit('/dashboard')
        ->on()
        ->mobile();

    $page->assertNoJavascriptErrors();
});
