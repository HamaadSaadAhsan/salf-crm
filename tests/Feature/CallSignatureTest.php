<?php

use App\Models\CallSession;
use App\Models\Lead;
use App\Models\User;
use App\Services\CallSessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->lead = Lead::factory()->create();
    $this->actingAs($this->user);
});

test('call signature is automatically generated when creating outbound call session', function () {
    $callSession = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'lead_id' => $this->lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    expect($callSession->call_signature)->not->toBeNull()
        ->and($callSession->call_signature)->toContain('LEAD')
        ->and($callSession->call_signature)->toContain('USER')
        ->and($callSession->call_signature)->toContain((string) $this->lead->id)
        ->and($callSession->call_signature)->toContain((string) $this->user->id);
});

test('call signature is not generated for inbound calls', function () {
    $callSession = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'call_direction' => 'inbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    expect($callSession->call_signature)->toBeNull();
});

test('generated call signature is unique', function () {
    $callSession1 = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'lead_id' => $this->lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    // Small delay to ensure different timestamp
    usleep(10000);

    $callSession2 = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'lead_id' => $this->lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    expect($callSession1->call_signature)->not->toBe($callSession2->call_signature);
});

test('can find call session by signature', function () {
    $callSession = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'lead_id' => $this->lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    $service = app(CallSessionService::class);
    $found = $service->findBySignature($callSession->call_signature);

    expect($found)->not->toBeNull()
        ->and($found->id)->toBe($callSession->id)
        ->and($found->call_signature)->toBe($callSession->call_signature);
});

test('can retrieve call session by signature via API', function () {
    $callSession = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'lead_id' => $this->lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    $response = $this->getJson(route('api.calls.by-signature', ['signature' => $callSession->call_signature]));

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'call_session' => [
                'id',
                'call_signature',
                'session_id',
                'lead_id',
                'caller_id',
            ],
        ])
        ->assertJson([
            'success' => true,
            'call_session' => [
                'id' => $callSession->id,
                'call_signature' => $callSession->call_signature,
            ],
        ]);
});

test('returns 404 when call session signature not found', function () {
    $response = $this->getJson(route('api.calls.by-signature', ['signature' => 'INVALID-SIGNATURE']));

    $response->assertNotFound()
        ->assertJson([
            'success' => false,
            'message' => 'Call session not found',
        ]);
});

test('can update recording path using call signature', function () {
    $callSession = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'lead_id' => $this->lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    $recordingPath = '/var/recordings/'.$callSession->call_signature.'.wav';

    $response = $this->postJson(route('asterisk.call-recording'), [
        'call_signature' => $callSession->call_signature,
        'recording_path' => $recordingPath,
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Recording path updated successfully',
        ]);

    $callSession->refresh();
    expect($callSession->recording_path)->toBe($recordingPath);
});

test('updating recording path with invalid signature returns 404', function () {
    $response = $this->postJson(route('asterisk.call-recording'), [
        'call_signature' => 'INVALID-SIGNATURE',
        'recording_path' => '/path/to/recording.wav',
    ]);

    $response->assertNotFound()
        ->assertJson([
            'success' => false,
            'message' => 'Call session not found with provided signature',
        ]);
});

test('call signature format is correct', function () {
    $callSession = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'lead_id' => $this->lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    // Expected format: LEAD-{lead_id}-USER-{user_id}-{timestamp}-{random}
    expect($callSession->call_signature)->toContain('LEAD')
        ->and($callSession->call_signature)->toContain('USER')
        ->and($callSession->call_signature)->toContain((string) $this->lead->id)
        ->and($callSession->call_signature)->toContain((string) $this->user->id)
        ->and(strlen($callSession->call_signature))->toBeGreaterThan(20); // Should be a reasonably long signature
});

test('can retrieve call signature data for asterisk', function () {
    $callSession = CallSession::create([
        'caller_id' => $this->user->id,
        'caller_number' => '1234567890',
        'callee_number' => '9876543210',
        'lead_id' => $this->lead->id,
        'call_direction' => 'outbound',
        'call_type' => 'voice',
        'status' => 'initiated',
        'started_at' => now(),
    ]);

    $service = app(CallSessionService::class);
    $asteriskData = $service->getCallSignatureForAsterisk($callSession);

    expect($asteriskData)->toBeArray()
        ->and($asteriskData)->toHaveKeys(['call_signature', 'session_id', 'lead_id', 'caller_id', 'timestamp'])
        ->and($asteriskData['call_signature'])->toBe($callSession->call_signature)
        ->and($asteriskData['session_id'])->toBe($callSession->session_id)
        ->and($asteriskData['lead_id'])->toBe($callSession->lead_id)
        ->and($asteriskData['caller_id'])->toBe($callSession->caller_id);
});
