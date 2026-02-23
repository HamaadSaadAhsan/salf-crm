<?php

use App\Models\Lead;
use App\Models\LeadSource;
use App\Models\Office;
use App\Models\Service;
use App\Models\User;
use App\Models\Zone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Permission::create(['name' => 'view reports']);
    Permission::create(['name' => 'view dashboard']);
    Permission::create(['name' => 'view leads']);

    $superAdmin = Role::create(['name' => 'super-admin']);
    $admin = Role::create(['name' => 'admin']);
    $manager = Role::create(['name' => 'manager']);
    $teamLead = Role::create(['name' => 'team-lead']);
    $supportAgent = Role::create(['name' => 'support-agent']);
    Role::create(['name' => 'senior-support-agent']);
    $salesRep = Role::create(['name' => 'sales-rep']);
    Role::create(['name' => 'senior-sales-rep']);

    $admin->givePermissionTo(['view reports', 'view dashboard']);
    $manager->givePermissionTo(['view reports', 'view dashboard']);
    $teamLead->givePermissionTo(['view reports', 'view dashboard']);
    $supportAgent->givePermissionTo(['view reports', 'view dashboard']);
    $salesRep->givePermissionTo(['view dashboard']);
});

function createAdminUser(): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('admin');

    return $user;
}

function createSalesRepUser(): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('sales-rep');

    return $user;
}

function createSupportAgentUser(): User
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('support-agent');

    return $user;
}

function seedReportData(): void
{
    $zone = Zone::factory()->create();
    $office = Office::factory()->create(['zone_id' => $zone->id, 'is_active' => true]);
    $source = LeadSource::factory()->create(['status' => 'active']);
    $service = Service::factory()->create();

    $admin = createAdminUser();
    $admin->update(['office_id' => $office->id, 'zone_id' => $zone->id]);

    Lead::factory()->count(5)->create([
        'inquiry_status' => 'won',
        'lead_source_id' => $source->id,
        'service_id' => $service->id,
        'assigned_to' => $admin->id,
        'qualified_by' => $admin->id,
        'converted_at' => now(),
        'qualified_at' => now()->subDays(5),
    ]);

    Lead::factory()->count(3)->create([
        'inquiry_status' => 'lost',
        'lead_source_id' => $source->id,
        'service_id' => $service->id,
        'assigned_to' => $admin->id,
        'qualified_by' => $admin->id,
        'loss_reason' => 'Budget',
    ]);

    Lead::factory()->count(2)->create([
        'inquiry_status' => 'new',
        'lead_source_id' => $source->id,
        'service_id' => $service->id,
        'assigned_to' => $admin->id,
    ]);
}

// --- Inertia Page Tests ---

test('reports index page renders for authorized user', function () {
    $user = createAdminUser();

    $this->actingAs($user)
        ->get('/reports')
        ->assertSuccessful();
});

test('reports show page renders for valid type', function () {
    $user = createAdminUser();

    $this->actingAs($user)
        ->get('/reports/leads-overall')
        ->assertSuccessful();
});

test('reports show page returns 404 for invalid type', function () {
    $user = createAdminUser();

    $this->actingAs($user)
        ->get('/reports/invalid-type')
        ->assertNotFound();
});

test('unauthenticated users cannot access reports', function () {
    $this->get('/reports')
        ->assertRedirect('/login');
});

// --- API Endpoint Tests ---

test('leads-overall API returns correct structure', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-overall')
        ->assertSuccessful()
        ->assertJsonStructure([
            'summary' => ['total_leads', 'won_leads', 'lost_leads', 'conversion_rate'],
            'chart_data',
            'table_data',
        ]);
});

test('leads-by-office API returns correct structure', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-by-office')
        ->assertSuccessful()
        ->assertJsonStructure([
            'summary' => ['total_leads', 'total_won', 'total_offices'],
            'chart_data',
            'table_data',
        ]);
});

test('leads-by-support-agent API returns correct structure', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-by-support-agent')
        ->assertSuccessful()
        ->assertJsonStructure([
            'summary' => ['total_leads', 'total_qualified', 'total_agents'],
            'chart_data',
            'table_data',
        ]);
});

test('leads-by-sales-rep API returns correct structure', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-by-sales-rep')
        ->assertSuccessful()
        ->assertJsonStructure([
            'summary' => ['total_leads', 'total_won', 'total_reps'],
            'chart_data',
            'table_data',
        ]);
});

test('leads-by-source API returns correct structure', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-by-source')
        ->assertSuccessful()
        ->assertJsonStructure([
            'summary' => ['total_leads', 'total_won', 'total_sources'],
            'chart_data',
            'table_data',
        ]);
});

test('leads-by-service API returns correct structure', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-by-service')
        ->assertSuccessful()
        ->assertJsonStructure([
            'summary' => ['total_leads', 'total_won', 'total_services'],
            'chart_data',
            'table_data',
        ]);
});

test('leads-conversion API returns correct structure', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-conversion')
        ->assertSuccessful()
        ->assertJsonStructure([
            'summary' => ['total_won', 'avg_conversion_days'],
            'chart_data',
            'table_data',
        ]);
});

test('leads-lost API returns correct structure', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-lost')
        ->assertSuccessful()
        ->assertJsonStructure([
            'summary' => ['total_lost'],
            'chart_data',
            'table_data',
        ]);
});

// --- Date Filter Tests ---

test('date filtering works correctly', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-overall?'.http_build_query([
            'date_from' => now()->subDays(30)->format('Y-m-d'),
            'date_to' => now()->format('Y-m-d'),
        ]))
        ->assertSuccessful()
        ->assertJsonStructure(['summary', 'chart_data', 'table_data']);
});

test('invalid date range returns validation error', function () {
    $user = createAdminUser();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-overall?'.http_build_query([
            'date_from' => '2025-01-31',
            'date_to' => '2025-01-01',
        ]))
        ->assertUnprocessable();
});

// --- Authorization Tests ---

test('sales rep without view reports permission cannot access reports API', function () {
    $user = createSalesRepUser();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-overall')
        ->assertForbidden();
});

test('sales rep without view reports permission cannot access reports page', function () {
    $user = createSalesRepUser();

    $this->actingAs($user)
        ->get('/reports')
        ->assertStatus(302); // Middleware redirects unauthorized Inertia requests
});

test('support agent with view reports permission can access reports API', function () {
    $user = createSupportAgentUser();

    $this->actingAs($user)
        ->getJson('/api/reports/leads-overall')
        ->assertSuccessful();
});

// --- Role-based Data Scoping Tests ---

test('admin sees all leads in reports', function () {
    seedReportData();
    $user = User::whereHas('roles', fn ($q) => $q->where('name', 'admin'))->first();

    $response = $this->actingAs($user)
        ->getJson('/api/reports/leads-overall')
        ->assertSuccessful();

    $total = $response->json('summary.total_leads');
    expect($total)->toBeGreaterThanOrEqual(10);
});

test('support agent sees only own leads in reports', function () {
    seedReportData();

    $agent = createSupportAgentUser();
    $source = LeadSource::first();
    $service = Service::first();

    Lead::factory()->count(3)->create([
        'inquiry_status' => 'new',
        'lead_source_id' => $source->id,
        'service_id' => $service->id,
        'assigned_to' => $agent->id,
        'qualified_by' => $agent->id,
    ]);

    $response = $this->actingAs($agent)
        ->getJson('/api/reports/leads-overall')
        ->assertSuccessful();

    expect($response->json('summary.total_leads'))->toBe(3);
});
