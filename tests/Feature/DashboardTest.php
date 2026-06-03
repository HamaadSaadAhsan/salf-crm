<?php

use App\Models\DailyMetric;
use App\Models\Lead;
use App\Models\Service;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

test('guests are redirected to the login page', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});

test('authenticated users can visit the dashboard', function () {
    Permission::firstOrCreate(['name' => 'view dashboard', 'guard_name' => 'web']);
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

test('super-admin overview prefers precomputed DailyMetric over live counts', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'sales-rep', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'senior-sales-rep', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    // Only two live leads exist, but DailyMetric reports much larger precomputed values.
    Lead::factory()->count(2)->create();

    DailyMetric::create([
        'metric_date' => now()->toDateString(),
        'total_leads' => 999,
        'qualified_leads' => 500,
        'converted_leads' => 100,
        'average_lifecycle_days' => 42,
    ]);

    $this->actingAs($user)
        ->getJson('/api/dashboard/overview')
        ->assertSuccessful()
        ->assertJsonPath('kpis.total_leads', 999)
        // LTQ = qualified/total = 500/999, QTS = won/qualified = 100/500
        ->assertJsonPath('kpis.ltq_rate', 50.05)
        ->assertJsonPath('kpis.qts_rate', 20);
});

test('super-admin lead delta counts only the previous calendar month, not the same month in other years', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'sales-rep', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'senior-sales-rep', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $lastMonthDay = now()->subMonthNoOverflow()->startOfMonth()->addDays(5);

    // One lead genuinely in the previous calendar month.
    Lead::factory()->create(['created_at' => $lastMonthDay]);

    // Decoy: same month number, but a year earlier. The old whereMonth() bug counted this.
    Lead::factory()->create(['created_at' => $lastMonthDay->copy()->subYear()]);

    $this->actingAs($user)
        ->getJson('/api/dashboard/overview')
        ->assertSuccessful()
        ->assertJsonPath('kpis.last_month_leads', 1);
});

test('super-admin program sales breakdown groups by program and excludes D-prefixed RBI services', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'sales-rep', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'senior-sales-rep', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $cbi = Service::factory()->create(['name' => 'CBI Programs', 'parent_id' => null]);
    $rbi = Service::factory()->create(['name' => 'RBI Programs', 'parent_id' => null]);

    $rbiNormal = Service::factory()->create(['name' => 'Malta RBI', 'parent_id' => $rbi->id]);
    $rbiExcluded = Service::factory()->create(['name' => 'D7 Visa', 'parent_id' => $rbi->id]);
    // CBI does not drop "D" services, so a Dominica program must still count.
    $cbiChild = Service::factory()->create(['name' => 'Dominica CBI', 'parent_id' => $cbi->id]);

    // RBI: one qualified+won, one plain → created 2, qualified 1, won 1
    Lead::factory()->create(['service_id' => $rbiNormal->id, 'inquiry_status' => 'won', 'qualified_at' => now()]);
    Lead::factory()->create(['service_id' => $rbiNormal->id, 'inquiry_status' => 'new', 'qualified_at' => null]);
    // Excluded D-prefixed RBI service — must not be counted at all.
    Lead::factory()->create(['service_id' => $rbiExcluded->id, 'inquiry_status' => 'won', 'qualified_at' => now()]);
    // CBI: one qualified lead on a D-named child (still counts for CBI).
    Lead::factory()->create(['service_id' => $cbiChild->id, 'inquiry_status' => 'qualified', 'qualified_at' => now()]);

    $this->actingAs($user)
        ->getJson('/api/dashboard/overview')
        ->assertSuccessful()
        ->assertJsonPath('kpis.program_sales.rbi.created', 2)
        ->assertJsonPath('kpis.program_sales.rbi.qualified', 1)
        ->assertJsonPath('kpis.program_sales.rbi.won', 1)
        ->assertJsonPath('kpis.program_sales.cbi.created', 1)
        ->assertJsonPath('kpis.program_sales.cbi.qualified', 1)
        ->assertJsonPath('kpis.program_sales.cbi.won', 0)
        ->assertJsonPath('kpis.program_sales.skilled.created', 0);
});
