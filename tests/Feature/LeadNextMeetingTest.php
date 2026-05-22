<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Database\Seeders\LeadsPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);
    $this->seed(LeadsPermissionsSeeder::class);

    $this->user = User::factory()->create(['email_verified_at' => now()]);
    $this->user->assignRole('admin');

    $this->lead = Lead::factory()->create();
});

function createMeetingActivity(string $leadId, int $userId, array $overrides = []): LeadActivity
{
    return LeadActivity::create(array_merge([
        'lead_id' => $leadId,
        'user_id' => $userId,
        'type' => 'meeting',
        'status' => 'pending',
        'subject' => 'Test meeting',
        'scheduled_at' => now()->addDays(2),
        'due_at' => now()->addDays(2)->addHour(),
        'duration_minutes' => 60,
    ], $overrides));
}

it('includes next_meeting in lead show response when a pending future meeting exists', function () {
    $meeting = createMeetingActivity($this->lead->id, $this->user->id, [
        'subject' => 'Discovery call',
        'scheduled_at' => now()->addDays(2),
        'due_at' => now()->addDays(2)->addHour(),
        'duration_minutes' => 60,
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('leads.show', [$this->lead, 'overview']));

    $response->assertSuccessful();
    $leadData = $response->original->getData()['page']['props']['lead'];
    expect($leadData['next_meeting'])->not->toBeNull()
        ->and($leadData['next_meeting']['id'])->toBe($meeting->id)
        ->and($leadData['next_meeting']['subject'])->toBe('Discovery call')
        ->and($leadData['next_meeting']['duration_minutes'])->toBe(60);
});

it('returns null next_meeting when no pending or overdue meetings exist', function () {
    // Create a completed future meeting
    createMeetingActivity($this->lead->id, $this->user->id, [
        'status' => 'completed',
        'subject' => 'Completed meeting',
        'scheduled_at' => now()->addDays(1),
        'due_at' => now()->addDays(1)->addHour(),
        'completed_at' => now()->addDays(1)->addHours(2),
    ]);

    // Create a cancelled meeting
    createMeetingActivity($this->lead->id, $this->user->id, [
        'status' => 'cancelled',
        'subject' => 'Cancelled meeting',
        'scheduled_at' => now()->addDays(3),
        'due_at' => now()->addDays(3)->addHour(),
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('leads.show', [$this->lead, 'overview']));

    $response->assertSuccessful();
    $leadData = $response->original->getData()['page']['props']['lead'];
    expect($leadData['next_meeting'])->toBeNull();
});

it('returns the soonest pending meeting as next_meeting', function () {
    createMeetingActivity($this->lead->id, $this->user->id, [
        'subject' => 'Later meeting',
        'scheduled_at' => now()->addDays(5),
        'due_at' => now()->addDays(5)->addHour(),
    ]);

    $soonestMeeting = createMeetingActivity($this->lead->id, $this->user->id, [
        'subject' => 'Soonest meeting',
        'scheduled_at' => now()->addDay(),
        'due_at' => now()->addDay()->addHour(),
    ]);

    $response = $this->actingAs($this->user)
        ->get(route('leads.show', [$this->lead, 'overview']));

    $response->assertSuccessful();
    $leadData = $response->original->getData()['page']['props']['lead'];
    expect($leadData['next_meeting'])->not->toBeNull()
        ->and($leadData['next_meeting']['id'])->toBe($soonestMeeting->id)
        ->and($leadData['next_meeting']['subject'])->toBe('Soonest meeting');
});

it('sends notification to assigned user when meeting is scheduled by another user', function () {
    $assignedUser = User::factory()->create(['email_verified_at' => now()]);
    $assignedUser->assignRole('admin');

    $this->lead->update(['assigned_to' => $assignedUser->id]);

    $scheduledAt = now()->addDays(3)->setTime(14, 0);
    $dueAt = now()->addDays(3)->setTime(15, 0);

    $this->actingAs($this->user)
        ->postJson('/lead-activities', [
            'lead_id' => $this->lead->id,
            'type' => 'meeting',
            'subject' => 'Notified meeting',
            'scheduled_at' => $scheduledAt->toISOString(),
            'due_at' => $dueAt->toISOString(),
            'duration_minutes' => 60,
            'description' => 'Test notification',
        ])
        ->assertSuccessful();

    expect($assignedUser->notifications)->toHaveCount(1)
        ->and($assignedUser->notifications->first()->data['activity_type'])->toBe('meeting')
        ->and($assignedUser->notifications->first()->data['action'])->toBe('created');
});

it('does not send notification when user schedules meeting for own lead', function () {
    $this->lead->update(['assigned_to' => $this->user->id]);

    $scheduledAt = now()->addDays(3)->setTime(14, 0);
    $dueAt = now()->addDays(3)->setTime(15, 0);

    $this->actingAs($this->user)
        ->postJson('/lead-activities', [
            'lead_id' => $this->lead->id,
            'type' => 'meeting',
            'subject' => 'Self meeting',
            'scheduled_at' => $scheduledAt->toISOString(),
            'due_at' => $dueAt->toISOString(),
            'description' => 'No notification',
        ])
        ->assertSuccessful();

    expect($this->user->fresh()->notifications)->toHaveCount(0);
});

it('prevents scheduling two meetings for the same lead on the same day', function () {
    $scheduledAt = now()->addDays(3)->setTime(10, 0);

    // First meeting succeeds
    $this->actingAs($this->user)
        ->postJson('/lead-activities', [
            'lead_id' => $this->lead->id,
            'type' => 'meeting',
            'subject' => 'First meeting',
            'scheduled_at' => $scheduledAt->toISOString(),
            'due_at' => $scheduledAt->copy()->addHour()->toISOString(),
            'duration_minutes' => 60,
            'description' => 'First',
        ])
        ->assertSuccessful();

    // Second meeting on the same day fails
    $secondTime = $scheduledAt->copy()->setTime(14, 0);

    $this->actingAs($this->user)
        ->postJson('/lead-activities', [
            'lead_id' => $this->lead->id,
            'type' => 'meeting',
            'subject' => 'Second meeting',
            'scheduled_at' => $secondTime->toISOString(),
            'due_at' => $secondTime->copy()->addHour()->toISOString(),
            'duration_minutes' => 60,
            'description' => 'Second',
        ])
        ->assertStatus(422)
        ->assertJsonPath('message', 'A meeting is already scheduled for this lead on this date.');
});

it('can schedule a meeting via the lead activities API', function () {
    $scheduledAt = now()->addDays(3)->setTime(14, 0);
    $dueAt = now()->addDays(3)->setTime(15, 0);

    $response = $this->actingAs($this->user)
        ->postJson('/lead-activities', [
            'lead_id' => $this->lead->id,
            'type' => 'meeting',
            'subject' => 'New meeting',
            'scheduled_at' => $scheduledAt->toISOString(),
            'due_at' => $dueAt->toISOString(),
            'duration_minutes' => 60,
            'description' => 'Test meeting',
        ]);

    $response->assertSuccessful();

    $this->assertDatabaseHas('lead_activities', [
        'lead_id' => $this->lead->id,
        'type' => 'meeting',
        'subject' => 'New meeting',
        'status' => 'pending',
    ]);
});
