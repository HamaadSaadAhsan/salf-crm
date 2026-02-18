<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Service;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);
    config(['scout.driver' => 'null']);
});

it('redirects unauthenticated requests', function () {
    $this->getJson('/api/global-search?q=test')
        ->assertUnauthorized();
});

it('returns validation error for query shorter than 2 characters', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($user)
        ->getJson('/api/global-search?q=a')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['q']);
});

it('returns validation error when query is missing', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($user)
        ->getJson('/api/global-search')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['q']);
});

it('returns leads matching the query', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create(['name' => 'Johnathan Doe']);
    Lead::factory()->create(['name' => 'Jane Smith']);

    $response = $this->actingAs($user)
        ->getJson('/api/global-search?q=Johnathan')
        ->assertOk()
        ->assertJsonStructure([
            'leads', 'tasks', 'users', 'services', 'activities',
        ]);

    $leads = $response->json('leads');
    expect($leads)->not->toBeEmpty();
    expect(collect($leads)->pluck('id'))->toContain($lead->id);
});

it('returns tasks matching the query', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $task = Task::factory()->create(['title' => 'Follow up UniqueTask']);
    Task::factory()->create(['title' => 'Other work']);

    $response = $this->actingAs($user)
        ->getJson('/api/global-search?q=UniqueTask')
        ->assertOk();

    $tasks = $response->json('tasks');
    expect($tasks)->not->toBeEmpty();
    expect(collect($tasks)->pluck('id'))->toContain($task->id);
});

it('returns users matching the query', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $target = User::factory()->create(['name' => 'SpecialUserName', 'email_verified_at' => now()]);

    $response = $this->actingAs($user)
        ->getJson('/api/global-search?q=SpecialUserName')
        ->assertOk();

    $users = $response->json('users');
    expect($users)->not->toBeEmpty();
    expect(collect($users)->pluck('id'))->toContain($target->id);
});

it('returns services matching the query', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $service = Service::factory()->create(['name' => 'UniqueServiceXYZ']);
    Service::factory()->create(['name' => 'Other Service']);

    $response = $this->actingAs($user)
        ->getJson('/api/global-search?q=UniqueServiceXYZ')
        ->assertOk();

    $services = $response->json('services');
    expect($services)->not->toBeEmpty();
    expect(collect($services)->pluck('id'))->toContain($service->id);
});

it('returns activities matching the query', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();
    $activity = LeadActivity::factory()->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'subject' => 'UniqueActivitySubject',
    ]);

    $response = $this->actingAs($user)
        ->getJson('/api/global-search?q=UniqueActivitySubject')
        ->assertOk();

    $activities = $response->json('activities');
    expect($activities)->not->toBeEmpty();
    expect(collect($activities)->pluck('id'))->toContain($activity->id);
});

it('returns empty arrays when nothing matches', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($user)
        ->getJson('/api/global-search?q=zzznomatchzqq')
        ->assertOk();

    expect($response->json('leads'))->toBe([]);
    expect($response->json('tasks'))->toBe([]);
    expect($response->json('services'))->toBe([]);
    expect($response->json('activities'))->toBe([]);
});

it('caps results at 5 per category', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    // Create 8 leads that will all match
    Lead::factory()->count(8)->create(['name' => 'CapTestLead Alpha']);

    $response = $this->actingAs($user)
        ->getJson('/api/global-search?q=CapTestLead')
        ->assertOk();

    expect(count($response->json('leads')))->toBeLessThanOrEqual(5);
});

it('returns correct result shape for each category', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    Lead::factory()->create(['name' => 'ShapeTest Lead']);

    $response = $this->actingAs($user)
        ->getJson('/api/global-search?q=ShapeTest')
        ->assertOk();

    $lead = collect($response->json('leads'))->first();
    expect($lead)->toHaveKeys(['id', 'label', 'meta', 'url']);
    expect($lead['label'])->toBe('ShapeTest Lead');
    expect($lead['url'])->toStartWith('/leads/');
});
