<?php

use App\Enums\TaskType;
use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);
    Permission::firstOrCreate(['name' => 'view leads', 'guard_name' => 'web']);
});

it('can create a task for a lead', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/tasks', [
            'taskable_type' => 'App\\Models\\Lead',
            'taskable_id' => $lead->id,
            'title' => 'Follow up with client',
            'description' => 'Discuss project requirements',
            'type' => 'follow_up',
            'priority' => 'high',
            'status' => 'pending',
            'due_at' => now()->addDays(2)->toDateTimeString(),
            'assigned_to_id' => $user->id,
        ]);

    $response->assertRedirect();

    expect(Task::count())->toBe(1);

    $task = Task::first();
    expect($task->title)->toBe('Follow up with client');
    expect($task->type)->toBe(TaskType::FOLLOW_UP);
    expect($task->priority->value)->toBe('high');
    expect($task->status->value)->toBe('pending');
    expect($task->taskable_id)->toBe($lead->id);
    expect($task->taskable_type)->toBe('App\\Models\\Lead');
    expect($task->assigned_to_id)->toBe($user->id);
});

it('can update a task', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();
    $task = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'title' => 'Original title',
        'type' => 'follow_up',
        'assigned_to_id' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->putJson("/tasks/{$task->id}", [
            'title' => 'Updated title',
            'description' => 'Updated description',
            'type' => 'call',
            'priority' => 'urgent',
            'status' => 'in_progress',
        ]);

    $response->assertRedirect();

    $task->refresh();
    expect($task->title)->toBe('Updated title');
    expect($task->description)->toBe('Updated description');
    expect($task->type)->toBe(TaskType::CALL);
    expect($task->priority->value)->toBe('urgent');
    expect($task->status->value)->toBe('in_progress');
});

it('can assign collaborators to a task', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $collaborator1 = User::factory()->create(['email_verified_at' => now()]);
    $collaborator2 = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/tasks', [
            'taskable_type' => 'App\\Models\\Lead',
            'taskable_id' => $lead->id,
            'title' => 'Team task',
            'type' => 'meeting',
            'assigned_to_id' => $user->id,
            'collaborators' => [$collaborator1->id, $collaborator2->id],
        ]);

    $response->assertRedirect();

    $task = Task::first();
    expect($task->collaborators)->toHaveCount(2);
    expect($task->collaborators->pluck('id')->toArray())->toContain($collaborator1->id, $collaborator2->id);
});

it('can update task collaborators', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $collaborator1 = User::factory()->create(['email_verified_at' => now()]);
    $collaborator2 = User::factory()->create(['email_verified_at' => now()]);
    $collaborator3 = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();

    $task = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'assigned_to_id' => $user->id,
    ]);

    $task->collaborators()->attach([$collaborator1->id, $collaborator2->id]);

    $response = $this->actingAs($user)
        ->putJson("/tasks/{$task->id}", [
            'title' => $task->title,
            'collaborators' => [$collaborator2->id, $collaborator3->id],
        ]);

    $response->assertRedirect();

    $task->refresh();
    expect($task->collaborators)->toHaveCount(2);
    expect($task->collaborators->pluck('id')->toArray())->toContain($collaborator2->id, $collaborator3->id);
    expect($task->collaborators->pluck('id')->toArray())->not->toContain($collaborator1->id);
});

it('validates task type', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/tasks', [
            'taskable_type' => 'App\\Models\\Lead',
            'taskable_id' => $lead->id,
            'title' => 'Test task',
            'type' => 'invalid_type',
        ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['type']);
});

it('validates required title field', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/tasks', [
            'taskable_type' => 'App\\Models\\Lead',
            'taskable_id' => $lead->id,
            'type' => 'follow_up',
        ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['title']);
});

it('can mark task as completed', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();
    $task = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'status' => 'pending',
        'assigned_to_id' => $user->id,
    ]);

    expect($task->completed_at)->toBeNull();

    $response = $this->actingAs($user)
        ->postJson("/tasks/{$task->id}/complete");

    $response->assertRedirect();

    $task->refresh();
    expect($task->status->value)->toBe('completed');
    expect($task->completed_at)->not->toBeNull();
});

it('can delete a task', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create();
    $task = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'assigned_to_id' => $user->id,
    ]);

    expect(Task::count())->toBe(1);

    $response = $this->actingAs($user)
        ->deleteJson("/tasks/{$task->id}");

    $response->assertRedirect();
    expect(Task::count())->toBe(0);
});

it('loads tasks with lead', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $lead = Lead::factory()->create();

    $tasks = Task::factory()->count(5)->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'assigned_to_id' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get("/leads/{$lead->id}/overview");

    $response->assertSuccessful();

    $props = $response->viewData('page')['props'];
    expect($props['lead']['tasks']['data'])->toHaveCount(5);
});

it('orders tasks by completion status and due date', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $lead = Lead::factory()->create();

    // Create completed task
    $completedTask = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'status' => 'completed',
        'completed_at' => now(),
        'due_at' => now()->subDays(5),
        'assigned_to_id' => $user->id,
    ]);

    // Create pending task with earlier due date
    $pendingTask1 = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'status' => 'pending',
        'completed_at' => null,
        'due_at' => now()->addDays(1),
        'assigned_to_id' => $user->id,
    ]);

    // Create pending task with later due date
    $pendingTask2 = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'status' => 'pending',
        'completed_at' => null,
        'due_at' => now()->addDays(5),
        'assigned_to_id' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get("/leads/{$lead->id}/overview");

    $response->assertSuccessful();

    $props = $response->viewData('page')['props'];
    $tasks = $props['lead']['tasks']['data'];

    // Pending tasks should come first, ordered by due_at
    expect($tasks[0]['id'])->toBe($pendingTask1->id);
    expect($tasks[1]['id'])->toBe($pendingTask2->id);
    expect($tasks[2]['id'])->toBe($completedTask->id);
});

it('limits tasks to 10 per lead', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $lead = Lead::factory()->create();

    Task::factory()->count(15)->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'assigned_to_id' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get("/leads/{$lead->id}/overview");

    $response->assertSuccessful();

    $props = $response->viewData('page')['props'];
    expect($props['lead']['tasks']['data'])->toHaveCount(10);
});

it('includes task type metadata', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $lead = Lead::factory()->create();
    $task = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'type' => 'call',
        'assigned_to_id' => $user->id,
    ]);

    $response = $this->actingAs($user)
        ->get("/leads/{$lead->id}/overview");

    $response->assertSuccessful();

    $props = $response->viewData('page')['props'];
    $taskData = $props['lead']['tasks']['data'][0];

    expect($taskData['type']['value'])->toBe('call');
    expect($taskData['type']['label'])->toBe('Call');
    expect($taskData['type']['color'])->toBe('green');
    expect($taskData['type']['icon'])->toBe('phone');
});

it('eager loads collaborators with tasks', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $collaborator = User::factory()->create(['name' => 'Jane Collaborator', 'email_verified_at' => now()]);
    $lead = Lead::factory()->create();

    $task = Task::factory()->create([
        'taskable_type' => 'App\\Models\\Lead',
        'taskable_id' => $lead->id,
        'assigned_to_id' => $user->id,
    ]);

    $task->collaborators()->attach($collaborator->id);

    $response = $this->actingAs($user)
        ->get("/leads/{$lead->id}/overview");

    $response->assertSuccessful();

    $props = $response->viewData('page')['props'];
    $taskData = $props['lead']['tasks']['data'][0];

    expect($taskData['collaborators'])->toHaveCount(1);
    expect($taskData['collaborators'][0]['name'])->toBe('Jane Collaborator');
});
