<?php

use App\Models\Lead;
use App\Models\User;
use App\Services\CallSessionService;
use Spatie\Permission\Models\Permission;

it('requires authentication for call routes', function () {
    $response = $this->get('/calls');
    $response->assertRedirect('/login');

    $response = $this->post('/calls');
    $response->assertRedirect('/login');
});

it('call routes exist', function () {
    Permission::firstOrCreate(['name' => 'make calls', 'guard_name' => 'web']);
    $user = User::factory()->create();
    $user->givePermissionTo('make calls');
    $this->actingAs($user);

    $response = $this->get('/calls');
    $response->assertOk();
});

it('generates call signature in correct format', function () {
    $user = User::factory()->create();
    $lead = Lead::factory()->create();

    $callSessionService = app(CallSessionService::class);
    $signatureData = $callSessionService->generateCallSignature($user, '03084920401', $lead);

    // Assert signature has correct format: LEAD-{lead_id}-USER-{user_id}-{timestamp}-{random}
    expect($signatureData['call_signature'])->toMatch('/^LEAD-[0-9a-f\-]+-USER-\d+-\d{4}-\d{2}-\d{2}-\d{6}-[A-Z0-9]{6}$/');
    expect($signatureData['call_signature'])->toContain("LEAD-{$lead->id}");
    expect($signatureData['call_signature'])->toContain("USER-{$user->id}");
    expect($signatureData)->toHaveKeys(['call_signature', 'session_id', 'lead_id', 'caller_id', 'timestamp']);
});

it('generates call signature without lead', function () {
    $user = User::factory()->create();

    $callSessionService = app(CallSessionService::class);
    $signatureData = $callSessionService->generateCallSignature($user, '03084920401', null);

    // Should have LEAD-NONE when no lead is provided
    expect($signatureData['call_signature'])->toContain('LEAD-NONE');
    expect($signatureData['call_signature'])->toContain("USER-{$user->id}");
    expect($signatureData['lead_id'])->toBeNull();
});
