<?php

use App\Models\CallLog;
use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use App\Services\CallSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create([
        'extension' => '1001',
        'phone' => '+1234567890',
    ]);
    $this->lead = Lead::factory()->create([
        'phone' => '+9876543210',
    ]);
    $this->actingAs($this->user);
});

test('initiating call creates call session with logs and activity', function () {
    $response = $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'call_session' => [
                'id',
                'session_id',
                'call_signature',
            ],
            'signature_data',
            'activity_created',
            'log_created',
        ])
        ->assertJson([
            'success' => true,
            'activity_created' => true,
            'log_created' => true,
        ]);

    // Verify call session was created
    expect(CallSession::count())->toBe(1);

    $callSession = CallSession::first();
    expect($callSession->caller_id)->toBe($this->user->id)
        ->and($callSession->callee_number)->toBe($this->lead->phone)
        ->and($callSession->lead_id)->toBe($this->lead->id)
        ->and($callSession->status)->toBe('initiated')
        ->and($callSession->call_signature)->not->toBeNull();
});

test('initiating call creates call log', function () {
    $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    expect(CallLog::count())->toBe(1);

    $callLog = CallLog::first();
    expect($callLog->log_level)->toBe('info')
        ->and($callLog->event_type)->toBe('call_initiated')
        ->and($callLog->message)->toBe('Outbound call initiated')
        ->and($callLog->source)->toBe('application');
});

test('initiating call creates lead activity', function () {
    $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    expect(LeadActivity::count())->toBe(1);

    $activity = LeadActivity::first();
    expect($activity->lead_id)->toBe($this->lead->id)
        ->and($activity->user_id)->toBe($this->user->id)
        ->and($activity->type)->toBe('call')
        ->and($activity->status)->toBe('pending')
        ->and($activity->subject)->toBe('Outbound Call');
});

test('initiating call without lead does not create activity', function () {
    $response = $this->postJson(route('api.calls.initiate'), [
        'phone_number' => '+9876543210',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'activity_created' => false,
            'log_created' => true,
        ]);

    expect(CallSession::count())->toBe(1)
        ->and(LeadActivity::count())->toBe(0)
        ->and(CallLog::count())->toBe(1);
});

test('call activity contains correct metadata', function () {
    $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $activity = LeadActivity::first();
    $metadata = $activity->metadata;

    expect($metadata)->toHaveKeys([
        'call_session_id',
        'session_id',
        'call_signature',
        'phone_number',
        'call_direction',
    ])
        ->and($metadata['phone_number'])->toBe($this->lead->phone)
        ->and($metadata['call_direction'])->toBe('outbound');
});

test('call log contains correct context', function () {
    $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $callLog = CallLog::first();
    $context = $callLog->context;

    expect($context)->toHaveKeys([
        'caller_number',
        'callee_number',
        'call_signature',
        'session_id',
    ])
        ->and($context['callee_number'])->toBe($this->lead->phone);
});

test('service method creates call session with tracking', function () {
    $service = app(CallSessionService::class);

    $result = $service->createCallSessionWithTracking(
        $this->user,
        $this->lead->phone,
        $this->lead
    );

    expect($result)->toHaveKeys(['call_session', 'call_log', 'activity'])
        ->and($result['call_session'])->toBeInstanceOf(CallSession::class)
        ->and($result['call_log'])->toBeInstanceOf(CallLog::class)
        ->and($result['activity'])->toBeInstanceOf(LeadActivity::class);
});

test('call session is linked to call log and activity', function () {
    $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $callSession = CallSession::first();
    $callLog = CallLog::first();
    $activity = LeadActivity::first();

    // Verify relationships
    expect($callLog->call_session_id)->toBe($callSession->id)
        ->and($activity->metadata['call_session_id'])->toBe($callSession->id)
        ->and($activity->metadata['session_id'])->toBe($callSession->session_id);
});

test('multiple calls create separate sessions logs and activities', function () {
    // First call
    $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    // Second call
    $lead2 = Lead::factory()->create([
        'phone' => '+1122334455',
    ]);
    $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $lead2->id,
    ]);

    expect(CallSession::count())->toBe(2)
        ->and(CallLog::count())->toBe(2)
        ->and(LeadActivity::count())->toBe(2);

    // Verify signatures are unique
    $signatures = CallSession::pluck('call_signature')->toArray();
    expect(count(array_unique($signatures)))->toBe(2);
});
