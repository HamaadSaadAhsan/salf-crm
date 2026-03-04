<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;

beforeEach(function () {
    config(['broadcasting.default' => 'log']);
    \Spatie\Permission\Models\Permission::firstOrCreate(['name' => 'view leads', 'guard_name' => 'web']);
});

it('can update subject and description of an activity', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $lead = Lead::factory()->create();

    $activity = LeadActivity::factory()->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'note',
        'subject' => 'Untitled note',
        'description' => '',
    ]);

    $response = $this->actingAs($user)
        ->putJson("/lead-activities/{$activity->id}", [
            'subject' => 'Updated title',
            'description' => 'Updated note content here',
        ]);

    $response->assertOk();

    $activity->refresh();
    expect($activity->subject)->toBe('Updated title');
    expect($activity->description)->toBe('Updated note content here');
});

it('can update only subject without affecting other fields', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $lead = Lead::factory()->create();

    $activity = LeadActivity::factory()->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'note',
        'subject' => 'Original subject',
        'description' => 'Original content',
        'status' => 'completed',
    ]);

    $response = $this->actingAs($user)
        ->putJson("/lead-activities/{$activity->id}", [
            'subject' => 'New subject',
        ]);

    $response->assertOk();

    $activity->refresh();
    expect($activity->subject)->toBe('New subject');
    expect($activity->description)->toBe('Original content');
    expect($activity->status)->toBe('completed');
});

it('validates description max length on update', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $lead = Lead::factory()->create();

    $activity = LeadActivity::factory()->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'type' => 'note',
    ]);

    $response = $this->actingAs($user)
        ->putJson("/lead-activities/{$activity->id}", [
            'description' => str_repeat('a', 10001),
        ]);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors('description');
});

it('can store a note with nullable description', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->givePermissionTo('view leads');
    $lead = Lead::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/lead-activities', [
            'lead_id' => $lead->id,
            'type' => 'note',
            'subject' => 'Untitled note',
        ]);

    $response->assertOk();
});
