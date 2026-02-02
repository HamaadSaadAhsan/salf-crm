<?php

use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Support\Str;

beforeEach(function () {
    // Disable broadcasting for tests
    config(['broadcasting.default' => 'log']);
});

it('automatically updates lead status to contacted when outbound call is answered', function () {
    // Create a user (caller)
    $user = User::factory()->create([
        'extension' => '1001',
    ]);

    // Create a lead with 'new' status
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'phone' => '+1234567890',
        'assigned_to' => $user->id,
    ]);

    // Create an outbound call session
    $sessionId = Str::uuid()->toString();
    $uniqueid = 'test-unique-id-'.Str::random(8);
    $callSession = CallSession::create([
        'session_id' => $sessionId,
        'uniqueid' => $uniqueid,
        'caller_id' => $user->id,
        'caller_number' => $user->extension,
        'callee_number' => '+1234567890',
        'lead_id' => $lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'started_at' => now(),
    ]);

    // Update call session status to 'answered' (simulating call being answered)
    $callSession->update([
        'status' => 'answered',
        'answered_at' => now(),
    ]);

    // Verify lead status was updated to 'contacted' and follow-up was set
    $lead->refresh();
    expect($lead->inquiry_status)->toBe('contacted');
    expect($lead->next_follow_up_at)->not->toBeNull();
    expect($lead->next_follow_up_at->diffInHours(now()->addDay()))->toBeLessThanOrEqual(1);

    // Verify status change activity was created
    $statusChangeActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'status_change')
        ->first();

    expect($statusChangeActivity)->not->toBeNull();
    expect($statusChangeActivity->subject)->toBe('Status changed from New to Contacted');
    expect($statusChangeActivity->metadata['previous_status'])->toBe('new');
    expect($statusChangeActivity->metadata['new_status'])->toBe('contacted');
    expect($statusChangeActivity->metadata['reason'])->toBe('outbound_call_answered');

    // Verify follow-up task was created for the assignee
    $followUpActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'follow_up')
        ->where('status', 'pending')
        ->first();

    expect($followUpActivity)->not->toBeNull();
    expect($followUpActivity->subject)->toBe('Follow up after outbound call');
    expect($followUpActivity->user_id)->toBe($user->id);
    expect($followUpActivity->category)->toBe('follow_up');
    expect($followUpActivity->metadata['triggered_by'])->toBe('outbound_call_answered');
    expect($followUpActivity->scheduled_at)->not->toBeNull();
    expect($followUpActivity->due_at)->not->toBeNull();
});

it('does not update lead status if lead is not in new status', function () {
    // Create a user (caller)
    $user = User::factory()->create([
        'extension' => '1001',
    ]);

    // Create a lead with 'qualified' status (not 'new')
    $lead = Lead::factory()->create([
        'inquiry_status' => 'qualified',
        'phone' => '+1234567890',
        'assigned_to' => $user->id,
    ]);

    // Create an outbound call session
    $sessionId = Str::uuid()->toString();
    $uniqueid = 'test-unique-id-'.Str::random(8);
    $callSession = CallSession::create([
        'session_id' => $sessionId,
        'uniqueid' => $uniqueid,
        'caller_id' => $user->id,
        'caller_number' => $user->extension,
        'callee_number' => '+1234567890',
        'lead_id' => $lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'started_at' => now(),
    ]);

    // Update call session status to 'answered'
    $callSession->update([
        'status' => 'answered',
        'answered_at' => now(),
    ]);

    // Verify lead status remains 'qualified'
    $lead->refresh();
    expect($lead->inquiry_status)->toBe('qualified');

    // Verify follow-up was still set (applies regardless of lead status)
    expect($lead->next_follow_up_at)->not->toBeNull();
    expect($lead->next_follow_up_at->diffInHours(now()->addDay()))->toBeLessThanOrEqual(1);

    // Verify no status change activity was created
    $statusChangeActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'status_change')
        ->where('subject', 'Status changed from New to Contacted')
        ->first();

    expect($statusChangeActivity)->toBeNull();
});

it('does not update lead status for inbound calls', function () {
    // Create a user
    $user = User::factory()->create([
        'extension' => '1001',
    ]);

    // Create a lead with 'new' status
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'phone' => '+1234567890',
    ]);

    // Create an INBOUND call session
    $sessionId = Str::uuid()->toString();
    $uniqueid = 'test-unique-id-'.Str::random(8);
    $callSession = CallSession::create([
        'session_id' => $sessionId,
        'uniqueid' => $uniqueid,
        'caller_number' => '+1234567890',
        'callee_number' => '1001',
        'lead_id' => $lead->id,
        'call_direction' => 'inbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'started_at' => now(),
        'intended_for_user_id' => $user->id,
    ]);

    // Update call session status to 'answered'
    $callSession->update([
        'status' => 'answered',
        'answered_at' => now(),
        'answered_by_user_id' => $user->id,
    ]);

    // Verify lead status remains 'new' (NOT updated for inbound calls)
    $lead->refresh();
    expect($lead->inquiry_status)->toBe('new');

    // Verify follow-up was set (applies to both inbound and outbound)
    expect($lead->next_follow_up_at)->not->toBeNull();
    expect($lead->next_follow_up_at->diffInHours(now()->addDay()))->toBeLessThanOrEqual(1);

    // Verify no status change activity was created
    $statusChangeActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'status_change')
        ->where('subject', 'Status changed from New to Contacted')
        ->first();

    expect($statusChangeActivity)->toBeNull();
});

it('updates call session status to answered', function () {
    // Create a user (caller)
    $user = User::factory()->create([
        'extension' => '1001',
    ]);

    // Create a lead
    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'phone' => '+1234567890',
    ]);

    // Create an outbound call session
    $sessionId = Str::uuid()->toString();
    $uniqueid = 'test-unique-id-'.Str::random(8);
    $callSession = CallSession::create([
        'session_id' => $sessionId,
        'uniqueid' => $uniqueid,
        'caller_id' => $user->id,
        'caller_number' => $user->extension,
        'callee_number' => '+1234567890',
        'lead_id' => $lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'started_at' => now(),
    ]);

    // Update call session status to 'answered'
    $callSession->update([
        'status' => 'answered',
        'answered_at' => now(),
    ]);

    // Verify call session was updated
    $callSession->refresh();
    expect($callSession->status)->toBe('answered');
    expect($callSession->answered_at)->not->toBeNull();
});
