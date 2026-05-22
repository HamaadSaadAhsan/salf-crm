<?php

use App\Events\TaskDueReminder;
use App\Events\TaskOverdue;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('api returns pending reminders for authenticated user', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    // Create tasks for authenticated user
    $overdueTask = Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->subHours(2),
        'completed_at' => null,
        'priority' => 'high',
    ]);

    $dueSoonTask = Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->addMinutes(30),
        'completed_at' => null,
        'priority' => 'medium',
    ]);

    // Create task for other user (should not be included)
    Task::factory()->create([
        'assigned_to_id' => $otherUser->id,
        'due_at' => now()->addMinutes(30),
        'completed_at' => null,
    ]);

    // Create completed task (should not be included)
    Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->subHours(1),
        'completed_at' => now(),
    ]);

    $response = $this->actingAs($user)->getJson('/api/tasks/pending-reminders');

    $response->assertSuccessful();
    $response->assertJsonCount(2, 'data');
    $response->assertJsonPath('data.0.id', $overdueTask->id);
    $response->assertJsonPath('data.1.id', $dueSoonTask->id);
});

test('api returns only urgent and high priority tasks due within 48 hours', function () {
    $user = User::factory()->create();

    // Urgent task due in 36 hours
    $urgentTask = Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->addHours(36),
        'completed_at' => null,
        'priority' => 'urgent',
    ]);

    // High priority task due in 40 hours
    $highTask = Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->addHours(40),
        'completed_at' => null,
        'priority' => 'high',
    ]);

    // Medium priority task due in 36 hours (should not be included)
    Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->addHours(36),
        'completed_at' => null,
        'priority' => 'medium',
    ]);

    // Urgent task due in 60 hours (should not be included - beyond 48h threshold)
    Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->addHours(60),
        'completed_at' => null,
        'priority' => 'urgent',
    ]);

    $response = $this->actingAs($user)->getJson('/api/tasks/pending-reminders');

    $response->assertSuccessful();
    $response->assertJsonCount(2, 'data');
});

test('api task complete endpoint marks task as completed', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create([
        'assigned_to_id' => $user->id,
        'created_by_id' => $user->id,
        'completed_at' => null,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($user)->postJson("/api/tasks/{$task->id}/complete");

    $response->assertSuccessful();
    $task->refresh();
    expect($task->completed_at)->not->toBeNull();
    expect($task->status->value)->toBe('completed');
});

test('api task incomplete endpoint marks task as incomplete', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create([
        'assigned_to_id' => $user->id,
        'created_by_id' => $user->id,
        'completed_at' => now(),
        'status' => 'completed',
    ]);

    $response = $this->actingAs($user)->postJson("/api/tasks/{$task->id}/incomplete");

    $response->assertSuccessful();
    $task->refresh();
    expect($task->completed_at)->toBeNull();
    expect($task->status->value)->toBe('pending');
});

test('check reminders command dispatches events for overdue tasks', function () {
    Event::fake([
        TaskOverdue::class,
    ]);

    $user = User::factory()->create();

    Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->subHours(3),
        'completed_at' => null,
    ]);

    $this->artisan('tasks:check-reminders')->assertSuccessful();

    Event::assertDispatched(TaskOverdue::class);
});

test('check reminders command dispatches events for urgent tasks', function () {
    Event::fake([
        TaskDueReminder::class,
    ]);

    $user = User::factory()->create();

    Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->addMinutes(20),
        'completed_at' => null,
    ]);

    $this->artisan('tasks:check-reminders')->assertSuccessful();

    Event::assertDispatched(TaskDueReminder::class, function ($event) {
        return $event->reminderType === 'urgent';
    });
});

test('check reminders command does not dispatch duplicate events', function () {
    Event::fake([
        TaskOverdue::class,
    ]);

    $user = User::factory()->create();

    Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->subHours(3),
        'completed_at' => null,
    ]);

    // Run command twice
    $this->artisan('tasks:check-reminders')->assertSuccessful();
    $this->artisan('tasks:check-reminders')->assertSuccessful();

    // Should only dispatch once (due to caching)
    Event::assertDispatchedTimes(TaskOverdue::class, 1);
});

test('overdue tasks are ordered first in reminders', function () {
    $user = User::factory()->create();

    $overdueTask = Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->subHours(5),
        'completed_at' => null,
        'priority' => 'medium',
    ]);

    $urgentTask = Task::factory()->create([
        'assigned_to_id' => $user->id,
        'due_at' => now()->addMinutes(10),
        'completed_at' => null,
        'priority' => 'urgent',
    ]);

    $response = $this->actingAs($user)->getJson('/api/tasks/pending-reminders');

    $response->assertSuccessful();
    $response->assertJsonPath('data.0.id', $overdueTask->id);
    $response->assertJsonPath('data.1.id', $urgentTask->id);
});
