<?php

namespace App\Http\Controllers;

use App\Models\Integration;
use App\Models\MetaPage;
use App\Models\OAuthSession;
use App\Services\FacebookService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Exception;

class FacebookOAuthController extends Controller
{
    private string $clientId;
    private string $clientSecret;
    private string $redirectUri;
    private array $scopes;

    private string $apiVersion = 'v23.0';

    public function __construct()
    {
        $this->clientId = config('services.facebook.app_id');
        $this->clientSecret = config('services.facebook.app_secret');
        $this->redirectUri = config('services.facebook.redirect_uri');
        $this->scopes = [
            'leads_retrieval',
            'pages_show_list',
            'pages_read_engagement',
            'ads_management',
            'ads_read',
            'pages_manage_ads',
            'pages_manage_metadata',
        ];
    }

    /**
     * Initiate Facebook OAuth flow
     */
    public function authorize(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id;
            $state = Str::random(32);
            $apiVersion = config('services.facebook.api_version');

            // Create an OAuth session
            OAuthSession::create([
                'user_id' => $userId,
                'state' => $state,
                'expires_at' => now()->addHour()
            ]);

            Log::info('Initiated Facebook OAuth flow', [
                'client_id' => $this->clientId,
                'redirect_uri' => $this->redirectUri,
                'scopes' => $this->scopes,
            ]);

            $authUrl = "https://www.facebook.com/$apiVersion/dialog/oauth?" . http_build_query([
                    'client_id' => $this->clientId,
                    'redirect_uri' => $this->redirectUri,
                    'scope' => implode(',', $this->scopes),
                    'response_type' => 'code',
                    'state' => $state,
                    'display' => 'popup'
                ]);

            return response()->json([
                'success' => true,
                'auth_url' => $authUrl,
                'state' => $state
            ]);

        } catch (Exception $e) {
            Log::error('Failed to initiate Facebook OAuth flow: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate authorization'
            ], 500);
        }
    }

    /**
     * Handle Facebook OAuth callback
     */
    public function callback(Request $request)
    {
        $frontendUrl = config('app.url');
        Log::info('Facebook OAuth callback', $request->all());
        try {
            $code = $request->get('code');
            $state = $request->get('state');
            $error = $request->get('error');

            if ($error) {
                return redirect(route('facebook.integration.index'))->with([
                    'success' => 'false',
                    'error' => $error,
                    'message' => 'Facebook authorization was denied or failed'
                ]);
            }

            if (!$code || !$state) {
                return redirect(route('facebook.integration.index'))->with([
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
                return redirect(route('integrations'))->with([
                    'success' => 'false',
                    'error' => 'invalid_session',
                    'message' => 'Invalid or expired OAuth session'
                ]);
            }

            // Exchange code for access token
            $tokens = $this->exchangeCodeForTokens($code);

            // Get user from OAuth session
            $user = \App\Models\User::find($oauthSession->user_id);

            if (!$user) {
                throw new Exception('User not found');
            }

            // Store user access token
            $user->updateFacebookTokens(
                $tokens['access_token'],
                $tokens['refresh_token'] ?? null,
                $tokens['expires_in'] ?? null
            );

            Log::info('Facebook user token stored', [
                'user_id' => $user->id,
                'token_expires_at' => $user->facebook_token_expires_at,
                'has_refresh_token' => !empty($tokens['refresh_token'])
            ]);

            // Get user's Facebook pages
            $pages = $this->getUserPages($tokens['access_token']);

            if (empty($pages)) {
                return redirect(route('integrations'))->with([
                    'success' => 'false',
                    'error' => 'no_pages',
                    'message' => 'No Facebook pages found for this account'
                ]);
            }


            // Store pages in the meta_pages table
            foreach ($pages as $pageData) {
                $this->storeMetaPage($user->id, $pageData);
            }

            // Store temporary data for page selection
            $tempData = [
                'user_access_token' => $tokens['access_token'],
                'pages' => $pages,
                'expires_at' => now()->addMinutes(10)
            ];

            // Store in cache for page selection
            cache()->put("facebook_oauth_temp_{$oauthSession->user_id}", $tempData, 600);

            // Clean up OAuth session
            $oauthSession->delete();

            // Redirect to page selection
            return redirect(route('integrations'))->with([
                'success' => 'true',
                'step' => 'select_page',
                'message' => 'Please select a Facebook page to integrate'
            ]);

        } catch (Exception $e) {
            Log::error('Facebook OAuth callback failed: ' . $e->getMessage());

            return redirect(route('integrations'))->with([
                'success' => 'false',
                'error' => 'server_error',
                'message' => 'Failed to complete authorization'
            ]);
        }
    }

    private function storeMetaPage(string $userId, array $pageData): void
    {
        MetaPage::updateOrCreate(
            [
                'user_id' => $userId,
                'page_id' => $pageData['id']
            ],
            [
                'name' => $pageData['name'],
                'access_token' => $pageData['access_token'] ?? '',
                'last_updated' => now()
            ]
        );
    }

    /**
     * Get available pages for selection
     */
    public function getPages(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id;
            $tempData = cache()->get("facebook_oauth_temp_{$userId}");

            if (!$tempData || $tempData['expires_at']->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'OAuth session expired. Please restart the authorization process.'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'pages' => $tempData['pages']
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get Facebook pages: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get available pages'
            ], 500);
        }
    }

    /**
     * Complete integration by selecting a page
     */
    public function selectPage(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'page_id' => 'required|string',
                'enable_messaging' => 'sometimes|boolean',
                'enable_posts' => 'sometimes|boolean',
                'enable_insights' => 'sometimes|boolean',
                'enable_comments' => 'sometimes|boolean',
                'webhook_verify_token' => 'sometimes|string|min:8|max:50'
            ]);

            $userId = $request->user()->id;
            $tempData = cache()->get("facebook_oauth_temp_{$userId}");

            if (!$tempData || $tempData['expires_at']->isPast()) {
                return response()->json([
                    'success' => false,
                    'message' => 'OAuth session expired. Please restart the authorization process.'
                ], 400);
            }

            $selectedPageId = $request->page_id;
            $selectedPage = collect($tempData['pages'])->firstWhere('id', $selectedPageId);

            if (!$selectedPage) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid page selected'
                ], 400);
            }

            // Get a long-lived page access token
            $pageAccessToken = $this->getLongLivedPageToken(
                $tempData['user_access_token'],
                $selectedPageId
            );

            // Create integration
            $config = [
                'app_id' => $this->clientId,
                'app_secret' => encrypt($this->clientSecret),
                'page_id' => $selectedPageId,
                'access_token' => encrypt($pageAccessToken),
                'webhook_verify_token' => $request->webhook_verify_token ?? Str::random(32),
                'features' => [
                    'messaging' => $request->enable_messaging ?? false,
                    'posts' => $request->enable_posts ?? true,
                    'insights' => $request->enable_insights ?? true,
                    'comments' => $request->enable_comments ?? false,
                ],
                'page_info' => $selectedPage,
                'oauth_completed_at' => now(),
            ];

            $integration = Integration::updateOrCreate(
                ['provider' => 'facebook'],
                [
                    'name' => 'Facebook - ' . $selectedPage['name'],
                    'config' => $config,
                    'active' => true,
                ]
            );

            // Clean up temporary data
            cache()->forget("facebook_oauth_temp_{$userId}");

            return response()->json([
                'success' => true,
                'message' => 'Facebook integration completed successfully',
                'integration' => [
                    'id' => $integration->id,
                    'provider' => $integration->provider,
                    'name' => $integration->name,
                    'active' => $integration->active,
                    'page_name' => $selectedPage['name'],
                    'page_id' => $selectedPageId
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Failed to complete Facebook integration: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to complete integration'
            ], 500);
        }
    }

    /**
     * Get integration status during OAuth flow
     */
    public function getOAuthStatus(Request $request): JsonResponse
    {
        try {
            $userId = $request->user()->id;
            $tempData = cache()->get("facebook_oauth_temp_{$userId}");

            if (!$tempData) {
                return response()->json([
                    'success' => true,
                    'status' => 'not_started',
                    'message' => 'OAuth flow not started'
                ]);
            }

            if ($tempData['expires_at']->isPast()) {
                cache()->forget("facebook_oauth_temp_{$userId}");
                return response()->json([
                    'success' => true,
                    'status' => 'expired',
                    'message' => 'OAuth session expired'
                ]);
            }

            return response()->json([
                'success' => true,
                'status' => 'pending_page_selection',
                'message' => 'Ready for page selection',
                'pages_count' => count($tempData['pages']),
                'expires_at' => $tempData['expires_at']
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get OAuth status: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to get OAuth status'
            ], 500);
        }
    }

    // Private helper methods

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function exchangeCodeForTokens(string $code): array
    {
        // Add debugging
        Log::info('Attempting to exchange code for tokens', [
            'client_id' => $this->clientId,
            'client_secret_length' => strlen($this->clientSecret),
            'redirect_uri' => $this->redirectUri,
            'code_length' => strlen($code)
        ]);

        $tokenUrl = 'https://graph.facebook.com/v23.0/oauth/access_token';
        $params = [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'code' => $code,
            'redirect_uri' => $this->redirectUri,
        ];

        Log::info('Token exchange request params', [
            'url' => $tokenUrl,
            'client_id' => $params['client_id'],
            'redirect_uri' => $params['redirect_uri'],
            'client_secret_masked' => substr($params['client_secret'], 0, 8) . '...'
        ]);

        $response = Http::post($tokenUrl, $params);

        Log::info('Token exchange response', [
            'status' => $response->status(),
            'successful' => $response->successful(),
            'body' => $response->body(),
            'headers' => $response->headers()
        ]);

        if (!$response->successful()) {
            $errorBody = $response->body();
            Log::error('Facebook token exchange failed', [
                'status' => $response->status(),
                'response' => $errorBody,
                'request_params' => [
                    'client_id' => $params['client_id'],
                    'redirect_uri' => $params['redirect_uri']
                ]
            ]);

            throw new Exception('Failed to exchange code for tokens: ' . $errorBody);
        }

        return $response->json();
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function getUserPages(string $accessToken): array
    {
        $response = Http::get('https://graph.facebook.com/v23.0/me/accounts', [
            'access_token' => $accessToken,
            'fields' => 'id,name,category,access_token,tasks,picture'
        ]);

        if (!$response->successful()) {
            throw new Exception('Failed to get user pages: ' . $response->body());
        }

        $data = $response->json();
        return $data['data'] ?? [];
    }

    /**
     * @throws ConnectionException
     * @throws Exception
     */
    private function getLongLivedPageToken(string $userAccessToken, string $pageId): string
    {
        // First get long-lived user access token
        $response = Http::get('https://graph.facebook.com/v23.0/oauth/access_token', [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'fb_exchange_token' => $userAccessToken
        ]);

        if (!$response->successful()) {
            throw new Exception('Failed to get long-lived user token: ' . $response->body());
        }

        $longLivedUserToken = $response->json()['access_token'];

        // Get page access token using long-lived user token
        $pagesResponse = Http::get('https://graph.facebook.com/v23.0/me/accounts', [
            'access_token' => $longLivedUserToken,
            'fields' => 'id,access_token'
        ]);

        if (!$pagesResponse->successful()) {
            throw new Exception('Failed to get page access token: ' . $pagesResponse->body());
        }

        $pages = $pagesResponse->json()['data'] ?? [];
        $selectedPage = collect($pages)->firstWhere('id', $pageId);

        if (!$selectedPage || !isset($selectedPage['access_token'])) {
            throw new Exception('Page access token not found');
        }

        return $selectedPage['access_token'];
    }
}
