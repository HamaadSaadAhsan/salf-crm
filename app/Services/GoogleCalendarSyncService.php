<?php

namespace App\Services;

use App\Models\CalendarIntegration;
use App\Models\Lead;
use App\Models\User;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleCalendarSyncService
{
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

    /**
     * Sync a lead's follow-up to Google Calendar for the assigned user.
     */
    public function syncLeadToCalendar(Lead $lead): ?string
    {
        $user = $lead->assignedTo;

        if (! $user) {
            return null;
        }

        $integration = $this->getActiveIntegration($user);

        if (! $integration || ! $this->isSyncLeadsEnabled($integration)) {
            return null;
        }

        $this->refreshTokenIfNeeded($integration);

        if ($lead->google_calendar_event_id) {
            return $this->updateCalendarEvent($integration, $lead);
        }

        return $this->createCalendarEvent($integration, $lead);
    }

    /**
     * Remove a lead's calendar event.
     */
    public function removeLeadFromCalendar(Lead $lead): bool
    {
        if (! $lead->google_calendar_event_id) {
            return true;
        }

        $user = $lead->assignedTo;

        if (! $user) {
            return false;
        }

        $integration = $this->getActiveIntegration($user);

        if (! $integration) {
            return false;
        }

        $this->refreshTokenIfNeeded($integration);

        return $this->deleteCalendarEvent($integration, $lead);
    }

    /**
     * Sync a lead's follow-up for a specific user (e.g. after reassignment).
     */
    public function syncLeadForUser(Lead $lead, User $user): ?string
    {
        $integration = $this->getActiveIntegration($user);

        if (! $integration || ! $this->isSyncLeadsEnabled($integration)) {
            return null;
        }

        $this->refreshTokenIfNeeded($integration);

        return $this->createCalendarEvent($integration, $lead);
    }

    /**
     * Create a Google Calendar event for a lead.
     */
    private function createCalendarEvent(CalendarIntegration $integration, Lead $lead): ?string
    {
        $calendarId = $integration->sync_preferences['defaultCalendarId'] ?? 'primary';
        $eventData = $this->buildEventPayload($lead);

        try {
            $response = Http::withToken($integration->access_token)
                ->post(self::CALENDAR_API_URL."/calendars/{$calendarId}/events", $eventData);

            if (! $response->successful()) {
                Log::error('Failed to create calendar event for lead', [
                    'lead_id' => $lead->id,
                    'status' => $response->status(),
                    'response' => $response->json(),
                ]);

                return null;
            }

            $eventId = $response->json('id');

            $lead->updateQuietly(['google_calendar_event_id' => $eventId]);

            return $eventId;
        } catch (ConnectionException $e) {
            Log::error('Connection failed creating calendar event', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Update an existing Google Calendar event for a lead.
     */
    private function updateCalendarEvent(CalendarIntegration $integration, Lead $lead): ?string
    {
        $calendarId = $integration->sync_preferences['defaultCalendarId'] ?? 'primary';
        $eventId = $lead->google_calendar_event_id;
        $eventData = $this->buildEventPayload($lead);

        try {
            $response = Http::withToken($integration->access_token)
                ->put(self::CALENDAR_API_URL."/calendars/{$calendarId}/events/{$eventId}", $eventData);

            if (! $response->successful()) {
                if ($response->status() === 404) {
                    // Event was deleted from Google Calendar, create a new one
                    $lead->updateQuietly(['google_calendar_event_id' => null]);

                    return $this->createCalendarEvent($integration, $lead);
                }

                Log::error('Failed to update calendar event for lead', [
                    'lead_id' => $lead->id,
                    'event_id' => $eventId,
                    'status' => $response->status(),
                ]);

                return null;
            }

            return $eventId;
        } catch (ConnectionException $e) {
            Log::error('Connection failed updating calendar event', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Delete a Google Calendar event for a lead.
     */
    private function deleteCalendarEvent(CalendarIntegration $integration, Lead $lead): bool
    {
        $calendarId = $integration->sync_preferences['defaultCalendarId'] ?? 'primary';
        $eventId = $lead->google_calendar_event_id;

        try {
            $response = Http::withToken($integration->access_token)
                ->delete(self::CALENDAR_API_URL."/calendars/{$calendarId}/events/{$eventId}");

            if ($response->successful() || $response->status() === 404 || $response->status() === 410) {
                $lead->updateQuietly(['google_calendar_event_id' => null]);

                return true;
            }

            Log::error('Failed to delete calendar event for lead', [
                'lead_id' => $lead->id,
                'event_id' => $eventId,
                'status' => $response->status(),
            ]);

            return false;
        } catch (ConnectionException $e) {
            Log::error('Connection failed deleting calendar event', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Build the Google Calendar event payload from a lead.
     */
    private function buildEventPayload(Lead $lead): array
    {
        $followUpAt = $lead->next_follow_up_at;
        $timezone = config('app.timezone');

        $summary = "Follow-up: {$lead->name}";
        $description = $this->buildEventDescription($lead);

        // If follow-up has a specific time, use dateTime; otherwise use all-day
        $start = Carbon::parse($followUpAt);
        $end = $start->copy()->addHour();

        return [
            'summary' => $summary,
            'description' => $description,
            'start' => [
                'dateTime' => $start->toIso8601String(),
                'timeZone' => $timezone,
            ],
            'end' => [
                'dateTime' => $end->toIso8601String(),
                'timeZone' => $timezone,
            ],
            'reminders' => [
                'useDefault' => false,
                'overrides' => [
                    ['method' => 'popup', 'minutes' => 30],
                    ['method' => 'popup', 'minutes' => 10],
                ],
            ],
            'extendedProperties' => [
                'private' => [
                    'salf_crm_lead_id' => $lead->id,
                    'salf_crm_source' => 'lead_sync',
                ],
            ],
        ];
    }

    /**
     * Build a rich description for the calendar event.
     */
    private function buildEventDescription(Lead $lead): string
    {
        $lines = [];
        $lines[] = "Lead: {$lead->name}";

        if ($lead->email) {
            $lines[] = "Email: {$lead->email}";
        }

        if ($lead->phone) {
            $lines[] = "Phone: {$lead->phone}";
        }

        if ($lead->service?->name) {
            $lines[] = "Service: {$lead->service->name}";
        }

        $lines[] = "Status: {$lead->inquiry_status}";
        $lines[] = "Priority: {$lead->priority}";

        if ($lead->detail) {
            $lines[] = "\nDetails:\n{$lead->detail}";
        }

        return implode("\n", $lines);
    }

    /**
     * Get active calendar integration for a user.
     */
    private function getActiveIntegration(User $user): ?CalendarIntegration
    {
        return $user->calendarIntegration()
            ->where('is_active', true)
            ->first();
    }

    /**
     * Check if lead syncing is enabled in the integration preferences.
     */
    private function isSyncLeadsEnabled(CalendarIntegration $integration): bool
    {
        return $integration->sync_preferences['syncLeads'] ?? true;
    }

    /**
     * Refresh the access token if it's expired or about to expire.
     *
     * @throws Exception
     */
    private function refreshTokenIfNeeded(CalendarIntegration $integration): void
    {
        if (! $integration->isTokenExpired()) {
            return;
        }

        if (! $integration->refresh_token) {
            throw new Exception("No refresh token available for integration {$integration->id}");
        }

        $response = Http::post(self::TOKEN_URL, [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $integration->refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if (! $response->successful()) {
            $integration->update(['is_active' => false]);

            throw new Exception("Failed to refresh token for integration {$integration->id}");
        }

        $tokens = $response->json();

        $integration->update([
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'] ?? $integration->refresh_token,
            'token_expires_at' => isset($tokens['expires_in'])
                ? now()->addSeconds($tokens['expires_in'])
                : now()->addHour(),
        ]);
    }
}
