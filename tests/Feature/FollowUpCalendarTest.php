<?php

use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

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
