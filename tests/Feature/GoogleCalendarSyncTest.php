<?php

use App\Jobs\RemoveLeadFromCalendar;
use App\Jobs\SyncLeadToCalendar;
use App\Models\CalendarIntegration;
use App\Models\Lead;
use App\Models\User;
use App\Services\GoogleCalendarSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'services.google.client_id' => 'test-client-id',
        'services.google.client_secret' => 'test-client-secret',
        'services.google.redirect_uri' => 'http://localhost/calendar/callback',
    ]);
});

function createCalendarTestUser(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $user = User::factory()->create(['email_verified_at' => now()]);
    $user->assignRole('super-admin');

    return $user;
}

function createCalendarTestLead(User $user, array $overrides = []): Lead
{
    return Lead::factory()->create(array_merge([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
    ], $overrides));
}

// --- Route Tests ---

it('returns calendar status for authenticated user', function () {
    $user = createCalendarTestUser();

    $response = $this->actingAs($user)->getJson('/calendar/status');

    $response->assertSuccessful();
    $response->assertJsonStructure(['success', 'isLinked']);
});

it('returns isLinked true when user has calendar integration', function () {
    $user = createCalendarTestUser();
    CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->getJson('/calendar/status');

    $response->assertSuccessful();
    $response->assertJson(['isLinked' => true]);
});

it('returns isLinked false when user has no calendar integration', function () {
    $user = createCalendarTestUser();

    $response = $this->actingAs($user)->getJson('/calendar/status');

    $response->assertSuccessful();
    $response->assertJson(['isLinked' => false]);
});

it('initiates OAuth flow and returns auth URL', function () {
    $user = createCalendarTestUser();

    $response = $this->actingAs($user)->postJson('/calendar/authorize');

    $response->assertSuccessful();
    $response->assertJsonStructure(['success', 'auth_url', 'state']);
    expect($response->json('auth_url'))->toContain('accounts.google.com');
});

it('shows calendar integration details', function () {
    $user = createCalendarTestUser();
    $integration = CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->getJson("/calendar/{$integration->id}");

    $response->assertSuccessful();
    $response->assertJson(['success' => true]);
});

it('returns 404 for non-existent integration', function () {
    $user = createCalendarTestUser();

    $response = $this->actingAs($user)->getJson('/calendar/nonexistent');

    $response->assertNotFound();
});

it('updates integration sync preferences', function () {
    $user = createCalendarTestUser();
    $integration = CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->putJson("/calendar/{$integration->id}", [
        'sync_preferences' => [
            'syncLeads' => false,
            'syncFollowUps' => true,
            'defaultCalendarId' => 'primary',
        ],
    ]);

    $response->assertSuccessful();
    $integration->refresh();
    expect($integration->sync_preferences['syncLeads'])->toBeFalse();
});

it('disconnects calendar integration', function () {
    $user = createCalendarTestUser();
    $integration = CalendarIntegration::factory()->create(['user_id' => $user->id]);

    Http::fake(['oauth2.googleapis.com/revoke*' => Http::response([], 200)]);

    $response = $this->actingAs($user)->deleteJson("/calendar/{$integration->id}");

    $response->assertSuccessful();
    $this->assertDatabaseMissing('calendar_integrations', ['id' => $integration->id]);
});

// --- Observer / Job Dispatch Tests ---

it('dispatches SyncLeadToCalendar when follow-up date is set', function () {
    Queue::fake();

    $user = createCalendarTestUser();
    CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create(['assigned_to' => $user->id, 'next_follow_up_at' => null]);

    $lead->update(['next_follow_up_at' => now()->addDay()]);

    Queue::assertPushed(SyncLeadToCalendar::class, function ($job) use ($lead) {
        return $job->lead->id === $lead->id;
    });
});

it('dispatches RemoveLeadFromCalendar when follow-up is cleared', function () {
    Queue::fake();

    $user = createCalendarTestUser();
    CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
        'google_calendar_event_id' => 'existing-event-123',
    ]);

    $lead->update(['next_follow_up_at' => null]);

    Queue::assertPushed(RemoveLeadFromCalendar::class, function ($job) use ($lead) {
        return $job->lead->id === $lead->id;
    });
});

it('dispatches RemoveLeadFromCalendar when lead is reassigned', function () {
    Queue::fake();

    $user1 = createCalendarTestUser();
    $user2 = User::factory()->create(['email_verified_at' => now()]);
    CalendarIntegration::factory()->create(['user_id' => $user1->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user1->id,
        'next_follow_up_at' => now()->addDay(),
        'google_calendar_event_id' => 'event-123',
    ]);

    $lead->update(['assigned_to' => $user2->id]);

    Queue::assertPushed(RemoveLeadFromCalendar::class);
    Queue::assertPushed(SyncLeadToCalendar::class);
});

it('does not dispatch sync when non-calendar fields change', function () {
    Queue::fake();

    $user = createCalendarTestUser();
    $lead = Lead::factory()->create(['assigned_to' => $user->id]);

    $lead->update(['detail' => 'Updated detail text']);

    Queue::assertNotPushed(SyncLeadToCalendar::class);
    Queue::assertNotPushed(RemoveLeadFromCalendar::class);
});

// --- Service Tests ---

it('creates calendar event via sync service', function () {
    Http::fake([
        'googleapis.com/calendar/v3/calendars/primary/events' => Http::response([
            'id' => 'new-event-id-123',
            'summary' => 'Follow-up: Test Lead',
            'status' => 'confirmed',
        ], 200),
    ]);

    $user = createCalendarTestUser();
    $integration = CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
    ]);

    $service = new GoogleCalendarSyncService;
    $eventId = $service->syncLeadToCalendar($lead);

    expect($eventId)->toBe('new-event-id-123');
    $lead->refresh();
    expect($lead->google_calendar_event_id)->toBe('new-event-id-123');
});

it('updates existing calendar event via sync service', function () {
    Http::fake([
        'googleapis.com/calendar/v3/calendars/primary/events/existing-event*' => Http::response([
            'id' => 'existing-event-456',
            'summary' => 'Follow-up: Test Lead',
            'status' => 'confirmed',
        ], 200),
    ]);

    $user = createCalendarTestUser();
    CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
        'google_calendar_event_id' => 'existing-event-456',
    ]);

    $service = new GoogleCalendarSyncService;
    $eventId = $service->syncLeadToCalendar($lead);

    expect($eventId)->toBe('existing-event-456');
});

it('removes calendar event via sync service', function () {
    Http::fake([
        'googleapis.com/calendar/v3/calendars/primary/events/event-to-delete*' => Http::response([], 204),
    ]);

    $user = createCalendarTestUser();
    CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
        'google_calendar_event_id' => 'event-to-delete',
    ]);

    $service = new GoogleCalendarSyncService;
    $result = $service->removeLeadFromCalendar($lead);

    expect($result)->toBeTrue();
    $lead->refresh();
    expect($lead->google_calendar_event_id)->toBeNull();
});

it('skips sync when user has no calendar integration', function () {
    $user = createCalendarTestUser();

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
    ]);

    $service = new GoogleCalendarSyncService;
    $result = $service->syncLeadToCalendar($lead);

    expect($result)->toBeNull();
});

it('skips sync when syncLeads is disabled', function () {
    $user = createCalendarTestUser();
    CalendarIntegration::factory()->syncLeadsDisabled()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
    ]);

    $service = new GoogleCalendarSyncService;
    $result = $service->syncLeadToCalendar($lead);

    expect($result)->toBeNull();
});

it('skips sync when integration is inactive', function () {
    $user = createCalendarTestUser();
    CalendarIntegration::factory()->inactive()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
    ]);

    $service = new GoogleCalendarSyncService;
    $result = $service->syncLeadToCalendar($lead);

    expect($result)->toBeNull();
});

it('skips sync when lead has no assigned user', function () {
    $lead = Lead::factory()->create([
        'assigned_to' => null,
        'next_follow_up_at' => now()->addDay(),
    ]);

    $service = new GoogleCalendarSyncService;
    $result = $service->syncLeadToCalendar($lead);

    expect($result)->toBeNull();
});

// --- Job Tests ---

it('SyncLeadToCalendar job calls sync service', function () {
    Http::fake([
        'googleapis.com/calendar/v3/calendars/primary/events' => Http::response([
            'id' => 'job-event-id',
            'summary' => 'Follow-up: Test Lead',
        ], 200),
    ]);

    $user = createCalendarTestUser();
    CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => now()->addDay(),
    ]);

    $job = new SyncLeadToCalendar($lead);
    $job->handle(app(GoogleCalendarSyncService::class));

    $lead->refresh();
    expect($lead->google_calendar_event_id)->toBe('job-event-id');
});

it('SyncLeadToCalendar job removes event when no follow-up', function () {
    Http::fake([
        'googleapis.com/calendar/v3/calendars/primary/events/old-event*' => Http::response([], 204),
    ]);

    $user = createCalendarTestUser();
    CalendarIntegration::factory()->create(['user_id' => $user->id]);

    $lead = Lead::factory()->create([
        'assigned_to' => $user->id,
        'next_follow_up_at' => null,
        'google_calendar_event_id' => 'old-event',
    ]);

    $job = new SyncLeadToCalendar($lead);
    $job->handle(app(GoogleCalendarSyncService::class));

    $lead->refresh();
    expect($lead->google_calendar_event_id)->toBeNull();
});

// --- Sync Preferences Tests ---

it('stores syncLeads preference correctly', function () {
    $user = createCalendarTestUser();
    $integration = CalendarIntegration::factory()->create(['user_id' => $user->id]);

    expect($integration->sync_preferences['syncLeads'])->toBeTrue();
    expect($integration->sync_preferences['syncFollowUps'])->toBeTrue();
    expect($integration->sync_preferences['defaultCalendarId'])->toBe('primary');
});

it('model default sync preferences use syncLeads', function () {
    $integration = new CalendarIntegration;
    $defaults = $integration->getDefaultSyncPreferences();

    expect($defaults)->toHaveKey('syncLeads');
    expect($defaults)->not->toHaveKey('syncTickets');
    expect($defaults['syncLeads'])->toBeTrue();
});
