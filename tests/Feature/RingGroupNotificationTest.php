<?php

use App\Events\InboundCallReceived;
use App\Models\CallSession;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    Event::fake([InboundCallReceived::class]);
});

it('broadcasts ring event when ring group member is notified', function () {
    // Create a user with extension 209
    $user = User::factory()->create(['extension' => '209']);
    $intendedUser = User::factory()->create(['extension' => '201']);
    $lead = Lead::factory()->create(['assigned_to' => $intendedUser->id]);

    // Create an existing call session (as would be created by incoming.php)
    $callSession = CallSession::create([
        'session_id' => fake()->uuid(),
        'uniqueid' => '1768035668.129',
        'caller_id' => null,
        'intended_for_user_id' => $intendedUser->id,
        'call_direction' => 'inbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'caller_number' => '03084920401',
        'callee_number' => '201',
        'started_at' => now(),
        'call_signature' => 'LEAD-'.$lead->id.'-USER-'.$intendedUser->id.'-'.date('Ymd-His').'-ABC123',
        'lead_id' => $lead->id,
    ]);

    // Simulate ring group notification for extension 209
    $response = $this->postJson('/asterisk/ring-group-member', [
        'exten' => '209',
        'uniqueid' => '1768035668.130',
        'linkedid' => '1768035668.129',
        'caller' => '03084920401',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Ring group member notification sent',
        ]);

    // Verify the event was broadcast with correct data
    Event::assertDispatched(InboundCallReceived::class, function ($event) use ($lead) {
        return $event->event === 'ring'
            && $event->exten === '209'
            && $event->targetExtension === '209'
            && $event->lead?->id === $lead->id;
    });
});

it('returns 404 when call session not found', function () {
    $response = $this->postJson('/asterisk/ring-group-member', [
        'exten' => '209',
        'uniqueid' => 'non-existent-id',
        'linkedid' => 'non-existent-linkedid',
        'caller' => '03084920401',
    ]);

    $response->assertNotFound()
        ->assertJson([
            'success' => false,
            'message' => 'Call session not found',
        ]);

    Event::assertNotDispatched(InboundCallReceived::class);
});

it('skips notification when call is already answered', function () {
    $intendedUser = User::factory()->create(['extension' => '201']);
    $answeredByUser = User::factory()->create(['extension' => '205']);

    // Create a call session that is already answered
    $callSession = CallSession::create([
        'session_id' => fake()->uuid(),
        'uniqueid' => '1768035668.129',
        'caller_id' => null,
        'intended_for_user_id' => $intendedUser->id,
        'answered_by_user_id' => $answeredByUser->id,
        'call_direction' => 'inbound',
        'call_type' => 'voice',
        'status' => 'answered',
        'caller_number' => '03084920401',
        'callee_number' => '201',
        'started_at' => now(),
        'answered_at' => now(),
        'call_signature' => 'TEST-SIGNATURE',
    ]);

    $response = $this->postJson('/asterisk/ring-group-member', [
        'exten' => '209',
        'uniqueid' => '1768035668.130',
        'linkedid' => '1768035668.129',
        'caller' => '03084920401',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Call already answered',
            'skipped' => true,
        ]);

    Event::assertNotDispatched(InboundCallReceived::class);
});

it('validates required fields', function () {
    $response = $this->postJson('/asterisk/ring-group-member', []);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['exten', 'uniqueid', 'linkedid']);
});

it('includes intended_for_user_id in broadcast for coverage call detection', function () {
    $intendedUser = User::factory()->create(['extension' => '201']);
    $lead = Lead::factory()->create(['assigned_to' => $intendedUser->id]);

    $callSession = CallSession::create([
        'session_id' => fake()->uuid(),
        'uniqueid' => '1768035668.129',
        'caller_id' => null,
        'intended_for_user_id' => $intendedUser->id,
        'call_direction' => 'inbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'caller_number' => '03084920401',
        'callee_number' => '201',
        'started_at' => now(),
        'call_signature' => 'TEST-SIGNATURE',
        'lead_id' => $lead->id,
    ]);

    $response = $this->postJson('/asterisk/ring-group-member', [
        'exten' => '209',
        'uniqueid' => '1768035668.130',
        'linkedid' => '1768035668.129',
    ]);

    $response->assertOk();

    // Verify intended_for_user_id is passed for coverage call detection on frontend
    Event::assertDispatched(InboundCallReceived::class, function ($event) use ($intendedUser) {
        return $event->intendedForUserId === $intendedUser->id
            && $event->isCoverageCall === false; // Not a coverage call during ring, only on connect
    });
});

it('uses caller from call session when not provided in request', function () {
    $intendedUser = User::factory()->create(['extension' => '201']);

    $callSession = CallSession::create([
        'session_id' => fake()->uuid(),
        'uniqueid' => '1768035668.129',
        'caller_id' => null,
        'intended_for_user_id' => $intendedUser->id,
        'call_direction' => 'inbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'caller_number' => '03084920401',
        'callee_number' => '201',
        'started_at' => now(),
        'call_signature' => 'TEST-SIGNATURE',
    ]);

    // Don't pass caller in request
    $response = $this->postJson('/asterisk/ring-group-member', [
        'exten' => '209',
        'uniqueid' => '1768035668.130',
        'linkedid' => '1768035668.129',
    ]);

    $response->assertOk();

    Event::assertDispatched(InboundCallReceived::class, function ($event) {
        return $event->caller === '03084920401';
    });
});

it('skips notification when extension matches original target', function () {
    // This tests the critical fix: when ring group includes the originally targeted extension,
    // we should NOT send a duplicate notification because they already received one via incoming.php
    $intendedUser = User::factory()->create(['extension' => '201']);
    $lead = Lead::factory()->create(['assigned_to' => $intendedUser->id]);

    $callSession = CallSession::create([
        'session_id' => fake()->uuid(),
        'uniqueid' => '1768035668.129',
        'caller_id' => null,
        'intended_for_user_id' => $intendedUser->id,
        'call_direction' => 'inbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'caller_number' => '03084920401',
        'callee_number' => '201', // Original target is extension 201
        'started_at' => now(),
        'call_signature' => 'TEST-SIGNATURE',
        'lead_id' => $lead->id,
    ]);

    // Try to notify extension 201 (the SAME as the original target)
    $response = $this->postJson('/asterisk/ring-group-member', [
        'exten' => '201', // Same as callee_number - should be skipped!
        'uniqueid' => '1768035668.130',
        'linkedid' => '1768035668.129',
        'caller' => '03084920401',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Skipped - extension is original target',
            'skipped' => true,
        ]);

    // Verify NO event was dispatched because this was a duplicate
    Event::assertNotDispatched(InboundCallReceived::class);
});

it('sends notification to different extension in ring group', function () {
    // This verifies that we DO notify new extensions in the ring group
    $intendedUser = User::factory()->create(['extension' => '201']);
    $lead = Lead::factory()->create(['assigned_to' => $intendedUser->id]);

    $callSession = CallSession::create([
        'session_id' => fake()->uuid(),
        'uniqueid' => '1768035668.129',
        'caller_id' => null,
        'intended_for_user_id' => $intendedUser->id,
        'call_direction' => 'inbound',
        'call_type' => 'voice',
        'status' => 'ringing',
        'caller_number' => '03084920401',
        'callee_number' => '201', // Original target is extension 201
        'started_at' => now(),
        'call_signature' => 'TEST-SIGNATURE',
        'lead_id' => $lead->id,
    ]);

    // Notify extension 209 (DIFFERENT from original target)
    $response = $this->postJson('/asterisk/ring-group-member', [
        'exten' => '209', // Different from callee_number - should notify!
        'uniqueid' => '1768035668.130',
        'linkedid' => '1768035668.129',
        'caller' => '03084920401',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'message' => 'Ring group member notification sent',
        ]);

    // Verify event WAS dispatched for this new extension
    Event::assertDispatched(InboundCallReceived::class, function ($event) use ($lead) {
        return $event->event === 'ring'
            && $event->exten === '209'
            && $event->targetExtension === '209'
            && $event->lead?->id === $lead->id;
    });
});
