<?php

use App\Ai\Tools\ActivitySummaryTool;
use App\Ai\Tools\CallMetricsTool;
use App\Ai\Tools\LeadSearchTool;
use App\Ai\Tools\LeadStatsTool;
use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Ai\Tools\Request;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'support-agent', 'guard_name' => 'web']);
});

test('LeadStatsTool returns correct counts grouped by status', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    Lead::factory()->count(3)->create(['inquiry_status' => 'new']);
    Lead::factory()->count(2)->create(['inquiry_status' => 'qualified']);

    $tool = new LeadStatsTool($user);
    $result = json_decode($tool->handle(new Request(['group_by' => 'status', 'date_range' => '30'])), true);

    expect($result['total_leads'])->toBe(5)
        ->and($result['breakdown']['new'])->toBe(3)
        ->and($result['breakdown']['qualified'])->toBe(2);
});

test('LeadStatsTool scopes CRO to own leads only', function () {
    $cro = User::factory()->create();
    $cro->assignRole('support-agent');
    $otherUser = User::factory()->create();

    Lead::factory()->count(3)->create(['assigned_to' => $cro->id, 'inquiry_status' => 'new']);
    Lead::factory()->count(5)->create(['assigned_to' => $otherUser->id, 'inquiry_status' => 'new']);

    $tool = new LeadStatsTool($cro);
    $result = json_decode($tool->handle(new Request(['group_by' => 'status', 'date_range' => '30'])), true);

    expect($result['total_leads'])->toBe(3);
});

test('LeadStatsTool admin sees all leads', function () {
    $admin = User::factory()->create();
    $admin->assignRole('super-admin');

    Lead::factory()->count(3)->create(['inquiry_status' => 'new']);
    Lead::factory()->count(5)->create(['inquiry_status' => 'contacted']);

    $tool = new LeadStatsTool($admin);
    $result = json_decode($tool->handle(new Request(['group_by' => 'status', 'date_range' => '30'])), true);

    expect($result['total_leads'])->toBe(8);
});

test('LeadSearchTool returns matching leads', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    Lead::factory()->create(['name' => 'John Smith', 'email' => 'john@example.com']);
    Lead::factory()->create(['name' => 'Jane Doe', 'email' => 'jane@example.com']);

    $tool = new LeadSearchTool($user);
    $result = json_decode($tool->handle(new Request(['query' => 'John', 'limit' => '10'])), true);

    expect($result['count'])->toBeGreaterThanOrEqual(1);
});

test('CallMetricsTool aggregates correctly', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    CallSession::factory()->count(3)->create([
        'call_direction' => 'outbound',
        'status' => 'ended',
        'answered_at' => now(),
        'duration' => 120,
    ]);

    CallSession::factory()->count(2)->create([
        'call_direction' => 'inbound',
        'status' => 'ended',
        'answered_at' => now(),
        'duration' => 60,
    ]);

    $tool = new CallMetricsTool($user);
    $result = json_decode($tool->handle(new Request(['group_by' => 'direction', 'date_range' => '30'])), true);

    expect($result['total_calls'])->toBe(5)
        ->and($result['answered_calls'])->toBe(5)
        ->and($result['breakdown'])->toHaveKeys(['outbound', 'inbound']);
});

test('CallMetricsTool scopes CRO to own calls', function () {
    $cro = User::factory()->create();
    $cro->assignRole('support-agent');
    $otherUser = User::factory()->create();

    CallSession::factory()->count(2)->create(['caller_id' => $cro->id, 'status' => 'ended', 'duration' => 60]);
    CallSession::factory()->count(3)->create(['caller_id' => $otherUser->id, 'status' => 'ended', 'duration' => 60]);

    $tool = new CallMetricsTool($cro);
    $result = json_decode($tool->handle(new Request(['group_by' => 'direction', 'date_range' => '30'])), true);

    expect($result['total_calls'])->toBe(2);
});

test('ActivitySummaryTool returns pending and overdue counts', function () {
    $user = User::factory()->create();
    $user->assignRole('super-admin');

    $lead = Lead::factory()->create();

    // Pending activity (future due date stays pending)
    LeadActivity::factory()->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'status' => 'pending',
        'type' => 'follow_up',
        'due_at' => now()->addDay(),
    ]);

    // Create an overdue activity by inserting directly to bypass boot auto-status change
    $overdueActivity = LeadActivity::factory()->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'call',
        'due_at' => now()->addDay(), // Create with future date first
    ]);

    // Manually update to past date while keeping status pending
    DB::table('lead_activities')
        ->where('id', $overdueActivity->id)
        ->update(['status' => 'pending', 'due_at' => now()->subDays(2)]);

    $tool = new ActivitySummaryTool($user);
    $result = json_decode($tool->handle(new Request(['filter' => 'all'])), true);

    expect($result['summary']['pending'])->toBeGreaterThanOrEqual(2)
        ->and($result['summary']['overdue'])->toBeGreaterThanOrEqual(1);
});
