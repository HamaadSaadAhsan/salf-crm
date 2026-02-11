<?php

use App\Models\Lead;
use App\Models\User;
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

test('initiating call with lead returns signature data', function () {
    $response = $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $response->assertOk()
        ->assertJsonStructure([
            'success',
            'signature_data' => [
                'call_signature',
                'session_id',
                'lead_id',
                'caller_id',
                'timestamp',
            ],
            'message',
        ])
        ->assertJson([
            'success' => true,
        ]);

    // Verify signature data contains correct info
    $signatureData = $response->json('signature_data');
    expect($signatureData['lead_id'])->toBe($this->lead->id)
        ->and($signatureData['caller_id'])->toBe($this->user->id);
});

test('initiating call without lead_id fails validation', function () {
    $response = $this->postJson(route('api.calls.initiate'), [
        'phone_number' => '+9876543210',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['lead_id']);
});

test('initiating call without phone number or lead fails', function () {
    $leadWithoutPhone = Lead::factory()->create(['phone' => null]);

    $response = $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $leadWithoutPhone->id,
    ]);

    $response->assertStatus(422)
        ->assertJson([
            'success' => false,
        ]);
});

test('call signature contains unique session id', function () {
    $response1 = $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $response2 = $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $sessionId1 = $response1->json('signature_data.session_id');
    $sessionId2 = $response2->json('signature_data.session_id');

    expect($sessionId1)->not->toBe($sessionId2);
});

test('call signature format is correct', function () {
    $response = $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $signature = $response->json('signature_data.call_signature');

    // Signature format: LEAD-{lead_id}-USER-{user_id}-{date}-{random}
    expect($signature)->toStartWith('LEAD-')
        ->and($signature)->toContain('-USER-')
        ->and($signature)->toContain("-{$this->user->id}-");
});

test('initiating call requires authentication', function () {
    $this->app['auth']->forgetGuards();

    $response = $this->postJson(route('api.calls.initiate'), [
        'lead_id' => $this->lead->id,
    ]);

    $response->assertUnauthorized();
});
