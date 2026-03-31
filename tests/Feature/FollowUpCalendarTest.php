<?php

use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use Spatie\Permission\Models\Role;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createCalTestUser(string $roleName = 'super-admin'): User
{
    Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole($roleName);

    return $user;
}

it('renders the follow-up calendar page', function () {
    $user = createCalTestUser();

    $response = $this->actingAs($user)->get(route('follow-up-calendar'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('calendar/index'));
});

it('returns lead follow-up events for super admin', function () {
    $admin = createCalTestUser();
    $otherUser = User::factory()->create(['email_verified_at' => now()]);

    Lead::factory()->create([
        'assigned_to' => $otherUser->id,
        'next_follow_up_at' => now()->addDays(2),
    ]);
    Lead::factory()->create([
        'assigned_to' => $admin->id,
        'next_follow_up_at' => now()->addDays(3),
    ]);

    $response = $this->actingAs($admin)->getJson(route('follow-up-calendar.events', [
        'start' => now()->startOfMonth()->toDateString(),
        'end' => now()->endOfMonth()->addWeek()->toDateString(),
    ]));

    $response->assertOk();
    $response->assertJsonCount(2, 'events');
});

it('returns only own follow-up events for non-admin user', function () {
    Role::firstOrCreate(['name' => 'advisor', 'guard_name' => 'web']);
    $advisor = User::factory()->create(['email_verified_at' => now()]);
    $advisor->assignRole('advisor');
    $otherUser = User::factory()->create(['email_verified_at' => now()]);

    Lead::factory()->create([
        'assigned_to' => $advisor->id,
        'next_follow_up_at' => now()->addDays(2),
    ]);
    Lead::factory()->create([
        'assigned_to' => $otherUser->id,
        'next_follow_up_at' => now()->addDays(3),
    ]);

    $response = $this->actingAs($advisor)->getJson(route('follow-up-calendar.events', [
        'start' => now()->startOfMonth()->toDateString(),
        'end' => now()->endOfMonth()->addWeek()->toDateString(),
    ]));

    $response->assertOk();
    $response->assertJsonCount(1, 'events');
});

it('returns task events alongside lead follow-ups', function () {
    $admin = createCalTestUser();

    Lead::factory()->create([
        'assigned_to' => $admin->id,
        'next_follow_up_at' => now()->addDays(2),
    ]);

    Task::factory()->create([
        'assigned_to_id' => $admin->id,
        'due_at' => now()->addDays(3),
    ]);

    $response = $this->actingAs($admin)->getJson(route('follow-up-calendar.events', [
        'start' => now()->startOfMonth()->toDateString(),
        'end' => now()->endOfMonth()->addWeek()->toDateString(),
    ]));

    $response->assertOk();
    $response->assertJsonCount(2, 'events');
});

it('validates start and end date parameters', function () {
    $admin = createCalTestUser();

    $response = $this->actingAs($admin)->getJson(route('follow-up-calendar.events'));

    $response->assertUnprocessable();
});

it('excludes leads without follow-up dates', function () {
    $admin = createCalTestUser();

    Lead::factory()->create([
        'assigned_to' => $admin->id,
        'next_follow_up_at' => now()->addDays(2),
    ]);
    Lead::factory()->create([
        'assigned_to' => $admin->id,
        'next_follow_up_at' => null,
    ]);

    $response = $this->actingAs($admin)->getJson(route('follow-up-calendar.events', [
        'start' => now()->startOfMonth()->toDateString(),
        'end' => now()->endOfMonth()->addWeek()->toDateString(),
    ]));

    $response->assertOk();
    $response->assertJsonCount(1, 'events');
});

it('creates a task from the calendar', function () {
    $admin = createCalTestUser();

    $response = $this->actingAs($admin)->postJson(route('follow-up-calendar.store-task'), [
        'title' => 'Call back client',
        'due_at' => now()->addDays(1)->toISOString(),
        'priority' => 'high',
        'type' => 'call',
    ]);

    $response->assertCreated();
    $response->assertJsonPath('success', true);

    $this->assertDatabaseHas('tasks', [
        'title' => 'Call back client',
        'priority' => 'high',
        'type' => 'call',
        'status' => 'pending',
        'created_by_id' => $admin->id,
        'assigned_to_id' => $admin->id,
    ]);
});

it('creates a task assigned to another user', function () {
    $admin = createCalTestUser();
    $other = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($admin)->postJson(route('follow-up-calendar.store-task'), [
        'title' => 'Review proposal',
        'due_at' => now()->addDays(2)->toISOString(),
        'assigned_to_id' => $other->id,
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('tasks', [
        'title' => 'Review proposal',
        'assigned_to_id' => $other->id,
        'created_by_id' => $admin->id,
    ]);
});

it('validates task creation requires title', function () {
    $admin = createCalTestUser();

    $response = $this->actingAs($admin)->postJson(route('follow-up-calendar.store-task'), [
        'due_at' => now()->addDays(1)->toISOString(),
    ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors('title');
});

it('sets a follow-up date on a lead', function () {
    $admin = createCalTestUser();
    $lead = Lead::factory()->create(['assigned_to' => $admin->id]);
    $followUpDate = now()->addDays(5);

    $response = $this->actingAs($admin)->postJson(route('follow-up-calendar.store-follow-up'), [
        'lead_id' => $lead->id,
        'next_follow_up_at' => $followUpDate->toISOString(),
    ]);

    $response->assertOk();
    $response->assertJsonPath('success', true);

    $lead->refresh();
    expect($lead->next_follow_up_at->toDateString())->toBe($followUpDate->toDateString());
});

it('prevents non-admin from setting follow-up on another users lead', function () {
    Role::firstOrCreate(['name' => 'advisor', 'guard_name' => 'web']);
    $advisor = User::factory()->create(['email_verified_at' => now()]);
    $advisor->assignRole('advisor');

    $otherUser = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create(['assigned_to' => $otherUser->id]);

    $response = $this->actingAs($advisor)->postJson(route('follow-up-calendar.store-follow-up'), [
        'lead_id' => $lead->id,
        'next_follow_up_at' => now()->addDays(3)->toISOString(),
    ]);

    $response->assertForbidden();
});

it('returns users list for assignment', function () {
    $admin = createCalTestUser();
    User::factory()->count(3)->create(['email_verified_at' => now()]);

    $response = $this->actingAs($admin)->getJson(route('follow-up-calendar.users'));

    $response->assertOk();
    $response->assertJsonStructure(['users' => [['id', 'name']]]);
});

it('returns leads list filtered by role', function () {
    $admin = createCalTestUser();

    Lead::factory()->count(3)->create(['assigned_to' => $admin->id]);

    $response = $this->actingAs($admin)->getJson(route('follow-up-calendar.leads'));

    $response->assertOk();
    $response->assertJsonCount(3, 'leads');
});

it('searches leads by name', function () {
    $admin = createCalTestUser();

    Lead::factory()->create(['assigned_to' => $admin->id, 'name' => 'John Doe']);
    Lead::factory()->create(['assigned_to' => $admin->id, 'name' => 'Jane Smith']);

    $response = $this->actingAs($admin)->getJson(route('follow-up-calendar.leads', ['search' => 'John']));

    $response->assertOk();
    $response->assertJsonCount(1, 'leads');
});
