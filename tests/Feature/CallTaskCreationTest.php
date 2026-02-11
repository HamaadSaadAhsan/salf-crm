<?php

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a follow-up task when an outbound call is answered', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'inquiry_status' => 'contacted',
        'priority' => 'medium',
    ]);

    $callSession = CallSession::factory()->create([
        'lead_id' => $lead->id,
        'caller_id' => $user->id,
        'call_direction' => 'outbound',
        'status' => 'initiated',
    ]);

    $callSession->update(['status' => 'answered']);

    $task = Task::where('taskable_type', Lead::class)
        ->where('taskable_id', $lead->id)
        ->where('type', TaskType::FOLLOW_UP)
        ->first();

    expect($task)->not->toBeNull()
        ->and($task->title)->toBe('Follow up after outbound call')
        ->and($task->status)->toBe(TaskStatus::PENDING)
        ->and($task->priority)->toBe(TaskPriority::MEDIUM)
        ->and($task->assigned_to_id)->toBe($user->id);
});

it('creates a follow-up task when an inbound call is answered', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'inquiry_status' => 'contacted',
        'priority' => 'urgent',
    ]);

    $callSession = CallSession::factory()->create([
        'lead_id' => $lead->id,
        'caller_id' => $user->id,
        'call_direction' => 'inbound',
        'status' => 'initiated',
    ]);

    $callSession->update(['status' => 'answered']);

    $task = Task::where('taskable_type', Lead::class)
        ->where('taskable_id', $lead->id)
        ->where('type', TaskType::FOLLOW_UP)
        ->first();

    expect($task)->not->toBeNull()
        ->and($task->title)->toBe('Follow up after inbound call')
        ->and($task->priority)->toBe(TaskPriority::URGENT);
});

it('reuses existing pending follow-up task on multiple calls for same lead', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'inquiry_status' => 'contacted',
        'priority' => 'medium',
    ]);

    // First call
    $callSession1 = CallSession::factory()->create([
        'lead_id' => $lead->id,
        'caller_id' => $user->id,
        'call_direction' => 'outbound',
        'status' => 'initiated',
    ]);
    $callSession1->update(['status' => 'answered']);

    // Second call
    $callSession2 = CallSession::factory()->create([
        'lead_id' => $lead->id,
        'caller_id' => $user->id,
        'call_direction' => 'inbound',
        'status' => 'initiated',
    ]);
    $callSession2->update(['status' => 'answered']);

    $taskCount = Task::where('taskable_type', Lead::class)
        ->where('taskable_id', $lead->id)
        ->where('type', TaskType::FOLLOW_UP)
        ->where('status', TaskStatus::PENDING)
        ->count();

    expect($taskCount)->toBe(1);

    // Task should be updated to reflect the latest call
    $task = Task::where('taskable_type', Lead::class)
        ->where('taskable_id', $lead->id)
        ->where('type', TaskType::FOLLOW_UP)
        ->first();

    expect($task->title)->toBe('Follow up after inbound call');
});

it('completes pending tasks when lead is qualified', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'inquiry_status' => 'contacted',
    ]);

    // Create a pending task for this lead
    Task::factory()->pending()->create([
        'taskable_type' => Lead::class,
        'taskable_id' => $lead->id,
        'type' => TaskType::FOLLOW_UP,
        'assigned_to_id' => $user->id,
    ]);

    // Create a pending follow-up activity
    LeadActivity::create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'follow_up',
        'status' => 'pending',
        'subject' => 'Follow up on contacted lead',
    ]);

    $this->actingAs($user);
    $lead->update(['inquiry_status' => 'qualified']);

    $pendingTasks = Task::where('taskable_type', Lead::class)
        ->where('taskable_id', $lead->id)
        ->where('status', TaskStatus::PENDING)
        ->count();

    $completedTasks = Task::where('taskable_type', Lead::class)
        ->where('taskable_id', $lead->id)
        ->where('status', TaskStatus::COMPLETED)
        ->count();

    expect($pendingTasks)->toBe(0)
        ->and($completedTasks)->toBe(1);

    // Check that pending follow-up activities were also completed
    $pendingActivities = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'follow_up')
        ->where('status', 'pending')
        ->count();

    expect($pendingActivities)->toBe(0);
});

it('completes pending tasks on terminal statuses', function (string $status) {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'inquiry_status' => 'contacted',
    ]);

    Task::factory()->pending()->create([
        'taskable_type' => Lead::class,
        'taskable_id' => $lead->id,
        'type' => TaskType::FOLLOW_UP,
        'assigned_to_id' => $user->id,
    ]);

    $this->actingAs($user);
    $lead->update(['inquiry_status' => $status]);

    $pendingTasks = Task::where('taskable_type', Lead::class)
        ->where('taskable_id', $lead->id)
        ->where('status', TaskStatus::PENDING)
        ->count();

    expect($pendingTasks)->toBe(0);
})->with(['won', 'lost', 'converted', 'unqualified']);

it('does not create a task when call has no lead', function () {
    $callSession = CallSession::factory()->create([
        'lead_id' => null,
        'call_direction' => 'outbound',
        'status' => 'initiated',
    ]);

    $callSession->update(['status' => 'answered']);

    expect(Task::count())->toBe(0);
});
