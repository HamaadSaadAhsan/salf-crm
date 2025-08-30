<?php

namespace App\Http\Controllers;

use App\Models\CalendarIntegration;
use App\Models\OAuthSession;
use Illuminate\Foundation\Application;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Redirector;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Exception;
use Inertia\Inertia;

class GoogleCalendarController extends Controller
{
    private string $clientId;
    private string $clientSecret;
    private string $redirectUri;
    private array $scopes;

    public function __construct()
    {
        $this->clientId = config('services.google.client_id');
        $this->clientSecret = config('services.google.client_secret');
        $this->redirectUri = config('services.google.redirect_uri');
        $this->scopes = [
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email'
        ];
    }

    /**
     * Get all calendar integrations for authenticated user
     */
    public function index(Request $request)
    {
        $integrations = CalendarIntegration::where('user_id', $request->user()->id)
            ->with('user:id,name,email')
            ->get();

        return Inertia::render('integrations/calendar/index', [
            'integrations' => $integrations
        ]);
    }

    /**
     * Get specific calendar integration
     */
    public function show(Request $request, string $id): JsonResponse
    {
        try {
            $integration = CalendarIntegration::where('user_id', $request->user()->id)
                ->where('id', $id)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Calendar integration not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'integration' => $integration
            ]);
        } catch (Exception $e) {
            Log::error('Failed to fetch calendar integration: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch calendar integration'
            ], 500);
        }
    }

    /**
     * Initiate Google OAuth flow
     */
    public function authorize(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id;
            $state = Str::random(32);

            // Create an OAuth session
            OAuthSession::create([
                'user_id' => $userId,
                'state' => $state,
                'expires_at' => now()->addHour()
            ]);

            $authUrl = 'https://accounts.google.com/o/oauth2/auth?' . http_build_query([
                    'client_id' => $this->clientId,
                    'redirect_uri' => $this->redirectUri,
                    'scope' => implode(' ', $this->scopes),
                    'response_type' => 'code',
                    'access_type' => 'offline',
                    'prompt' => 'consent',
                    'state' => $state
                ]);

            return response()->json([
                'success' => true,
                'auth_url' => $authUrl,
                'state' => $state
            ]);
        } catch (Exception $e) {
            Log::error('Failed to initiate OAuth flow: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate authorization'
            ], 500);
        }
    }

    /**
     * Handle Google OAuth callback
     */
    public function callback(Request $request)
    {
        try {
            $code = $request->get('code');
            $state = $request->get('state');
            $error = $request->get('error');

            if ($error) {
                return redirect()->route('integrations')
                    ->with([
                        'success' => 'false',
                        'error' => $error,
                        'message' => 'Authorization was denied or failed'
                    ]);
            }

            if (!$code || !$state) {
                return redirect()->route('integrations')
                    ->with([
                        'success' => 'false',
                        'error' => 'missing_params',
                        'message' => 'Missing authorization code or state'
                    ]);
            }

            // Verify OAuth session
            $oauthSession = OAuthSession::where('state', $state)
                ->where('expires_at', '>', now())
                ->first();

            if (!$oauthSession) {
                return redirect()->route('integrations')
                    ->with([
                        'success' => 'false',
                        'error' => 'invalid_session',
                        'message' => 'Invalid or expired OAuth session'
                    ]);
            }

            // Exchange code for tokens
            $tokens = $this->exchangeCodeForTokens($code);

            // Get user info from Google
            $userInfo = $this->getGoogleUserInfo($tokens['access_token']);

            // Create or update calendar integration
            $calendarIntegration = CalendarIntegration::updateOrCreate(
                ['user_id' => $oauthSession->user_id],
                [
                    'google_account_email' => $userInfo['email'],
                    'access_token' => $tokens['access_token'],
                    'refresh_token' => $tokens['refresh_token'] ?? '',
                    'token_expires_at' => isset($tokens['expires_in'])
                        ? now()->addSeconds($tokens['expires_in'])
                        : now()->addHour(),
                    'is_active' => true,
                    'sync_preferences' => $calendarIntegration->sync_preferences ?? [
                            'syncTickets' => true,
                            'syncFollowUps' => true,
                            'defaultCalendarId' => 'primary'
                        ]
                ]
            );

            // Clean up OAuth session
            $oauthSession->delete();

            return redirect()->route('integrations')
                ->with([
                    'success' => 'true',
                    'integration_id' => $calendarIntegration->id,
                    'message' => 'Calendar integration connected successfully'
                ]);
        } catch (Exception $e) {
            Log::error('OAuth callback failed: ' . $e->getMessage());

            return redirect()->route('integrations')
                ->with([
                    'success' => 'false',
                    'error' => 'server_error',
                    'message' => 'Failed to complete authorization'
                ]);
        }
    }

    /**
     * Update calendar integration settings
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $request->validate([
                'is_active' => 'sometimes|boolean',
                'sync_preferences' => 'sometimes|array',
                'sync_preferences.syncTickets' => 'sometimes|boolean',
                'sync_preferences.syncFollowUps' => 'sometimes|boolean',
                'sync_preferences.defaultCalendarId' => 'sometimes|string'
            ]);

            $integration = CalendarIntegration::where('user_id', $request->user()->id)
                ->where('id', $id)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Calendar integration not found'
                ], 404);
            }

            $integration->update($request->only(['is_active', 'sync_preferences']));

            return response()->json([
                'success' => true,
                'message' => 'Calendar integration updated successfully',
                'integration' => $integration->fresh()
            ]);

        } catch (Exception $e) {
            Log::error('Failed to update calendar integration: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to update calendar integration'
            ], 500);
        }
    }

    /**
     * Disconnect calendar integration
     */
    public function disconnect(Request $request, string $id): JsonResponse
    {
        try {
            $integration = CalendarIntegration::where('user_id', $request->user()->id)
                ->where('id', $id)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Calendar integration not found'
                ], 404);
            }

            // Revoke Google token
            $this->revokeGoogleToken($integration->access_token);

            // Delete integration
            $integration->delete();

            return response()->json([
                'success' => true,
                'message' => 'Calendar integration disconnected successfully'
            ]);

        } catch (Exception $e) {
            Log::error('Failed to disconnect calendar integration: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to disconnect calendar integration'
            ], 500);
        }
    }

    /**
     * Refresh access token
     */
    public function refreshToken(Request $request, string $id): JsonResponse
    {
        try {
            $integration = CalendarIntegration::where('user_id', $request->user()->id)
                ->where('id', $id)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Calendar integration not found'
                ], 404);
            }

            if (!$integration->refresh_token) {
                return response()->json([
                    'success' => false,
                    'message' => 'No refresh token available. Please reconnect your account.'
                ], 400);
            }

            // Refresh the token
            $tokens = $this->refreshAccessToken($integration->refresh_token);

            // Update integration with new tokens
            $integration->update([
                'access_token' => $tokens['access_token'],
                'refresh_token' => $tokens['refresh_token'] ?? $integration->refresh_token,
                'token_expires_at' => isset($tokens['expires_in'])
                    ? now()->addSeconds($tokens['expires_in'])
                    : now()->addHour(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Token refreshed successfully',
                'integration' => $integration->fresh()
            ]);

        } catch (Exception $e) {
            Log::error('Failed to refresh token: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to refresh token'
            ], 500);
        }
    }

    /**
     * Get user's Google calendars
     */
    public function getCalendars(Request $request, string $id): JsonResponse
    {
        try {
            $integration = CalendarIntegration::where('user_id', $request->user()->id)
                ->where('id', $id)
                ->where('is_active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Active calendar integration not found'
                ], 404);
            }

            // Check if token is expired and refresh if needed
            if ($integration->isTokenExpired() && $integration->refresh_token) {
                $this->refreshIntegrationToken($integration);
            }

            $calendars = $this->fetchGoogleCalendars($integration->access_token);

            return response()->json([
                'success' => true,
                'calendars' => $calendars
            ]);

        } catch (Exception $e) {
            Log::error('Failed to fetch calendars: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch calendars'
            ], 500);
        }
    }

    /**
     * Create calendar event
     */
    public function createEvent(Request $request, string $id): JsonResponse
    {
        try {
            $request->validate([
                'summary' => 'required|string|max:255',
                'description' => 'sometimes|string',
                'start' => 'required|date',
                'end' => 'required|date|after:start',
                'calendar_id' => 'sometimes|string'
            ]);

            $integration = CalendarIntegration::where('user_id', $request->user()->id)
                ->where('id', $id)
                ->where('is_active', true)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Active calendar integration not found'
                ], 404);
            }

            // Check if token is expired and refresh if needed
            if ($integration->isTokenExpired() && $integration->refresh_token) {
                $this->refreshIntegrationToken($integration);
            }

            $calendarId = $request->get('calendar_id', 'primary');
            $event = $this->createGoogleCalendarEvent(
                $integration->access_token,
                $calendarId,
                $request->all()
            );

            return response()->json([
                'success' => true,
                'message' => 'Event created successfully',
                'event' => $event
            ]);

        } catch (Exception $e) {
            Log::error('Failed to create calendar event: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to create calendar event'
            ], 500);
        }
    }

    /**
     * Get integration status and health check
     */
    public function status(Request $request, string $id): JsonResponse
    {
        try {
            $integration = CalendarIntegration::where('user_id', $request->user()->id)
                ->where('id', $id)
                ->first();

            if (!$integration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Calendar integration not found'
                ], 404);
            }

            $status = [
                'is_active' => $integration->is_active,
                'is_token_expired' => $integration->isTokenExpired(),
                'has_refresh_token' => !empty($integration->refresh_token),
                'token_expires_at' => $integration->token_expires_at,
                'google_account_email' => $integration->google_account_email,
                'sync_preferences' => $integration->sync_preferences
            ];

            // Test API connection if active and token is valid
            if ($integration->is_active && !$integration->isTokenExpired()) {
                try {
                    $this->testGoogleApiConnection($integration->access_token);
                    $status['api_connection'] = 'healthy';
                } catch (Exception $e) {
                    $status['api_connection'] = 'failed';
                    $status['api_error'] = $e->getMessage();
                }
            } else {
                $status['api_connection'] = 'unavailable';
            }

            return response()->json([
                'success' => true,
                'status' => $status
            ]);

        } catch (Exception $e) {
            Log::error('Failed to check integration status: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to check integration status'
            ], 500);
        }
    }

    public function isAnyCalendarConnected(): JsonResponse
    {
        $isCalendarConnected = (bool)Auth::user()->calendarIntegration;
        return response()->json([
            'success' => true,
            'isLinked' => $isCalendarConnected,
            $isCalendarConnected ? Auth::user()->calendarIntegration : []
        ]);
    }

    // Private helper methods

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function exchangeCodeForTokens(string $code): array
    {
        $response = Http::post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $this->redirectUri,
        ]);

        if (!$response->successful()) {
            throw new Exception('Failed to exchange code for tokens');
        }

        return $response->json();
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function getGoogleUserInfo(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/oauth2/v2/userinfo');

        if (!$response->successful()) {
            throw new Exception('Failed to get user info from Google');
        }

        return $response->json();
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function refreshAccessToken(string $refreshToken): array
    {
        $response = Http::post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token',
        ]);

        if (!$response->successful()) {
            throw new Exception('Failed to refresh access token');
        }

        return $response->json();
    }

    /**
     * @throws Exception
     */
    private function refreshIntegrationToken(CalendarIntegration $integration): void
    {
        $tokens = $this->refreshAccessToken($integration->refresh_token);

        $integration->update([
            'access_token' => $tokens['access_token'],
            'refresh_token' => $tokens['refresh_token'] ?? $integration->refresh_token,
            'token_expires_at' => isset($tokens['expires_in'])
                ? now()->addSeconds($tokens['expires_in'])
                : now()->addHour(),
        ]);
    }

    /**
     * @throws ConnectionException
     */
    private function revokeGoogleToken(string $accessToken): void
    {
        Http::post("https://oauth2.googleapis.com/revoke?token={$accessToken}");
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function fetchGoogleCalendars(string $accessToken): array
    {
        $response = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/calendar/v3/users/me/calendarList');

        if (!$response->successful()) {
            throw new Exception('Failed to fetch calendars from Google');
        }

        return $response->json()['items'] ?? [];
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function createGoogleCalendarEvent(string $accessToken, string $calendarId, array $eventData): array
    {
        $event = [
            'summary' => $eventData['summary'],
            'description' => $eventData['description'] ?? '',
            'start' => [
                'dateTime' => Carbon::parse($eventData['start'])->toISOString(),
                'timeZone' => config('app.timezone')
            ],
            'end' => [
                'dateTime' => Carbon::parse($eventData['end'])->toISOString(),
                'timeZone' => config('app.timezone')
            ]
        ];

        $response = Http::withToken($accessToken)
            ->post("https://www.googleapis.com/calendar/v3/calendars/{$calendarId}/events", $event);

        if (!$response->successful()) {
            throw new Exception('Failed to create calendar event');
        }

        return $response->json();
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function testGoogleApiConnection(string $accessToken): void
    {
        $response = Http::withToken($accessToken)
            ->get('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1');

        if (!$response->successful()) {
            throw new Exception('Google API connection test failed');
        }
    }
}
