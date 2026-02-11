<?php

use App\Models\Lead;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Seed roles and permissions
    $this->seed(\Database\Seeders\TicketsLeadsPermissionsSeeder::class);

    $this->lead = Lead::factory()->create([
        'phone' => '+1234567890',
    ]);
});

it('hides phone from lead API response when user lacks view phone numbers permission', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('sales-rep');

    // Assign lead to user so they can view it
    $this->lead->update(['assigned_to' => $user->id]);

    $response = $this->actingAs($user)
        ->getJson(route('api.leads.show', $this->lead));

    $response->assertSuccessful();
    $data = $response->json('data');
    expect($data)->not->toHaveKey('phone');
});

it('shows phone in lead API response when user has view phone numbers permission', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('admin');

    $response = $this->actingAs($user)
        ->getJson(route('api.leads.show', $this->lead));

    $response->assertSuccessful();
    $data = $response->json('data');
    expect($data)->toHaveKey('phone')
        ->and($data['phone'])->toBe('+1234567890');
});

it('hides phone numbers from call history when user lacks permission', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('sales-rep');

    $response = $this->actingAs($user)
        ->getJson(route('api.leads.calls', $this->lead));

    $response->assertSuccessful();
    $calls = $response->json('calls');

    foreach ($calls as $call) {
        expect($call)->not->toHaveKey('caller_number')
            ->and($call)->not->toHaveKey('callee_number');
    }
});

it('shows phone numbers in call history when user has permission', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('admin');

    // Create a call session for this lead
    \App\Models\CallSession::factory()->create([
        'lead_id' => $this->lead->id,
        'caller_id' => $user->id,
        'caller_number' => '100',
        'callee_number' => '+1234567890',
        'call_direction' => 'outbound',
        'status' => 'ended',
        'started_at' => now(),
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('api.leads.calls', $this->lead));

    $response->assertSuccessful();
    $calls = $response->json('calls');

    expect($calls)->toHaveCount(1)
        ->and($calls[0])->toHaveKey('caller_number')
        ->and($calls[0])->toHaveKey('callee_number');
});

it('requires lead_id when initiating a call', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'extension' => '100',
    ]);
    $user->assignRole('sales-rep');

    $response = $this->actingAs($user)
        ->postJson('/api/calls/initiate', []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['lead_id']);
});

it('initiates call with lead_id only and does not require phone_number', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'extension' => '100',
    ]);
    $user->assignRole('sales-rep');

    $response = $this->actingAs($user)
        ->postJson('/api/calls/initiate', [
            'lead_id' => $this->lead->id,
        ]);

    $response->assertSuccessful();
    $signatureData = $response->json('signature_data');

    expect($signatureData)->toHaveKey('call_signature')
        ->and($signatureData)->toHaveKey('caller_id')
        ->and($signatureData)->not->toHaveKey('callee_number')
        ->and($signatureData)->not->toHaveKey('caller_number');
});

it('strips phone_number from activity metadata when user lacks permission', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('sales-rep');

    // Create a call activity with phone_number in metadata
    \App\Models\LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $user->id,
        'type' => 'call',
        'status' => 'completed',
        'subject' => 'Outbound Call',
        'description' => 'Call initiated to +1234567890',
        'metadata' => [
            'call_session_id' => 1,
            'phone_number' => '+1234567890',
            'call_direction' => 'outbound',
        ],
        'completed_at' => now(),
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('lead-activities.index', ['lead_id' => $this->lead->id]));

    $response->assertSuccessful();
    $activities = $response->json('data');

    expect($activities)->toHaveCount(1);
    $activity = $activities[0];
    expect($activity['metadata'])->not->toHaveKey('phone_number')
        ->and($activity['description'])->not->toContain('+1234567890');
});

it('keeps phone_number in activity metadata when user has permission', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('admin');

    \App\Models\LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $user->id,
        'type' => 'call',
        'status' => 'completed',
        'subject' => 'Outbound Call',
        'description' => 'Call initiated to +1234567890',
        'metadata' => [
            'call_session_id' => 1,
            'phone_number' => '+1234567890',
            'call_direction' => 'outbound',
        ],
        'completed_at' => now(),
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('lead-activities.index', ['lead_id' => $this->lead->id]));

    $response->assertSuccessful();
    $activities = $response->json('data');

    expect($activities)->toHaveCount(1);
    $activity = $activities[0];
    expect($activity['metadata'])->toHaveKey('phone_number')
        ->and($activity['metadata']['phone_number'])->toBe('+1234567890')
        ->and($activity['description'])->toContain('+1234567890');
});

it('returns error when initiating call to lead without phone number', function () {
    $leadNoPhone = Lead::factory()->create(['phone' => null]);

    $user = User::factory()->create([
        'email_verified_at' => now(),
        'extension' => '100',
    ]);
    $user->assignRole('sales-rep');

    $response = $this->actingAs($user)
        ->postJson('/api/calls/initiate', [
            'lead_id' => $leadNoPhone->id,
        ]);

    $response->assertUnprocessable();
    expect($response->json('message'))->toContain('does not have a phone number');
});
