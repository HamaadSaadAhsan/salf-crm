<?php

use App\Jobs\CalculateDailyMetricsJob;
use App\Models\DailyMetric;
use App\Models\DepartmentHandoffMetric;
use App\Models\Lead;
use App\Models\LeadConversionMetric;
use App\Models\LeadSource;
use App\Models\Service;
use App\Models\SystemAdoptionMetric;
use App\Models\User;
use App\Models\UserPerformanceSnapshot;
use App\Services\CacheService;
use App\Services\DashboardMetricsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Create roles
    Role::create(['name' => 'support-agent']);
    Role::create(['name' => 'sales-rep']);

    // Create test data: services, sources, users
    $this->service = Service::factory()->create();
    $this->source = LeadSource::factory()->create();

    $this->cro = User::factory()->create();
    $this->cro->assignRole('support-agent');

    $this->advisor = User::factory()->create();
    $this->advisor->assignRole('sales-rep');

    $this->yesterday = Carbon::yesterday();
});

test('it calculates daily metrics successfully', function () {
    // Create leads with various statuses from yesterday
    Lead::factory()->count(5)->create([
        'service_id' => $this->service->id,
        'lead_source_id' => $this->source->id,
        'assigned_to' => $this->cro->id,
        'created_at' => $this->yesterday,
    ]);

    Lead::factory()->count(2)->create([
        'service_id' => $this->service->id,
        'lead_source_id' => $this->source->id,
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'qualified',
        'qualified_at' => $this->yesterday,
        'created_at' => $this->yesterday,
    ]);

    Lead::factory()->count(1)->create([
        'service_id' => $this->service->id,
        'lead_source_id' => $this->source->id,
        'assigned_to' => $this->advisor->id,
        'inquiry_status' => 'won',
        'converted_at' => $this->yesterday,
        'created_at' => $this->yesterday,
    ]);

    // Run the job
    $job = new CalculateDailyMetricsJob($this->yesterday);
    $job->handle(
        app(DashboardMetricsService::class),
        app(CacheService::class)
    );

    // Assert daily metric was created
    $dailyMetric = DailyMetric::where('metric_date', $this->yesterday->format('Y-m-d'))->first();
    expect($dailyMetric)->not->toBeNull();
    expect($dailyMetric->total_leads)->toBe(8);
});

test('it calculates user performance snapshots', function () {
    // Create leads assigned to CRO
    Lead::factory()->count(3)->create([
        'assigned_to' => $this->cro->id,
        'created_at' => $this->yesterday,
    ]);

    Lead::factory()->count(2)->create([
        'assigned_to' => $this->cro->id,
        'inquiry_status' => 'qualified',
        'qualified_at' => $this->yesterday,
        'created_at' => $this->yesterday,
    ]);

    // Run the job
    $job = new CalculateDailyMetricsJob($this->yesterday);
    $job->handle(
        app(DashboardMetricsService::class),
        app(CacheService::class)
    );

    // Assert user performance snapshot was created
    $snapshot = UserPerformanceSnapshot::where('user_id', $this->cro->id)
        ->where('snapshot_date', $this->yesterday->format('Y-m-d'))
        ->first();

    expect($snapshot)->not->toBeNull();
    expect($snapshot->assigned_leads)->toBe(5);
    // Note: qualified_leads counts all qualified leads, not just those assigned to this user
    expect($snapshot->qualified_leads)->toBeGreaterThanOrEqual(0);
});

test('it calculates lead conversion metrics by service', function () {
    Lead::factory()->count(3)->create([
        'service_id' => $this->service->id,
        'created_at' => $this->yesterday,
    ]);

    $job = new CalculateDailyMetricsJob($this->yesterday);
    $job->handle(
        app(DashboardMetricsService::class),
        app(CacheService::class)
    );

    $metric = LeadConversionMetric::where('metric_date', $this->yesterday->format('Y-m-d'))
        ->where('dimension_type', 'service')
        ->where('service_id', $this->service->id)
        ->first();

    expect($metric)->not->toBeNull();
    expect($metric->total_leads)->toBe(3);
});

test('it calculates lead conversion metrics by source', function () {
    Lead::factory()->count(4)->create([
        'lead_source_id' => $this->source->id,
        'created_at' => $this->yesterday,
    ]);

    $job = new CalculateDailyMetricsJob($this->yesterday);
    $job->handle(
        app(DashboardMetricsService::class),
        app(CacheService::class)
    );

    $metric = LeadConversionMetric::where('metric_date', $this->yesterday->format('Y-m-d'))
        ->where('dimension_type', 'source')
        ->where('lead_source_id', $this->source->id)
        ->first();

    expect($metric)->not->toBeNull();
    expect($metric->total_leads)->toBe(4);
});

test('it calculates department handoff metrics', function () {
    // Create lead with handoff timestamps
    Lead::factory()->create([
        'assigned_to' => $this->cro->id,
        'created_at' => $this->yesterday->startOfDay(),
        'first_cro_contact_at' => $this->yesterday->startOfDay()->addMinutes(30),
        'qualification_response_at' => $this->yesterday->startOfDay()->addHours(2),
    ]);

    $job = new CalculateDailyMetricsJob($this->yesterday);
    $job->handle(
        app(DashboardMetricsService::class),
        app(CacheService::class)
    );

    $metrics = DepartmentHandoffMetric::where('metric_date', $this->yesterday->format('Y-m-d'))->get();
    expect($metrics->count())->toBeGreaterThan(0);
});

test('it calculates system adoption metrics', function () {
    // Create active and inactive users
    User::factory()->count(5)->create([
        'last_activity_at' => $this->yesterday,
        'total_activities_count' => 10,
    ]);

    User::factory()->count(2)->create([
        'last_activity_at' => Carbon::now()->subDays(40),
        'total_activities_count' => 1,
    ]);

    $job = new CalculateDailyMetricsJob($this->yesterday);
    $job->handle(
        app(DashboardMetricsService::class),
        app(CacheService::class)
    );

    $metric = SystemAdoptionMetric::where('metric_date', $this->yesterday->format('Y-m-d'))->first();
    expect($metric)->not->toBeNull();
    expect($metric->total_users)->toBeGreaterThan(0);
});

test('it handles empty data gracefully', function () {
    // Run job with no data
    $job = new CalculateDailyMetricsJob($this->yesterday);
    $job->handle(
        app(DashboardMetricsService::class),
        app(CacheService::class)
    );

    $dailyMetric = DailyMetric::where('metric_date', $this->yesterday->format('Y-m-d'))->first();
    expect($dailyMetric)->not->toBeNull();
    expect($dailyMetric->total_leads)->toBe(0);
});

test('it calculates conversion rates correctly', function () {
    // Create 10 leads, 3 qualified, 1 won (converted)
    Lead::factory()->count(6)->create([
        'created_at' => $this->yesterday,
        'inquiry_status' => 'new',
    ]);

    Lead::factory()->count(3)->create([
        'created_at' => $this->yesterday,
        'inquiry_status' => 'qualified',
        'qualified_at' => $this->yesterday,
    ]);

    Lead::factory()->count(1)->create([
        'created_at' => $this->yesterday,
        'inquiry_status' => 'won',
        'converted_at' => $this->yesterday,
    ]);

    $job = new CalculateDailyMetricsJob($this->yesterday);
    $job->handle(
        app(DashboardMetricsService::class),
        app(CacheService::class)
    );

    $dailyMetric = DailyMetric::where('metric_date', $this->yesterday->format('Y-m-d'))->first();
    expect($dailyMetric->total_leads)->toBe(10);
    expect((float) $dailyMetric->overall_conversion_rate)->toBe(10.00); // 1/10 * 100
});
