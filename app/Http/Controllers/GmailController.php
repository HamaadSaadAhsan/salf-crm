<?php

namespace App\Http\Controllers;

use App\Models\GmailIntegration;
use App\Models\OAuthSession;
use App\Services\GmailService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GmailController extends Controller
{
    private string $clientId;

    private string $redirectUri;

    private array $scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
    ];

    public function __construct(private readonly GmailService $gmailService)
    {
        $this->clientId = config('services.gmail.client_id');
        $this->redirectUri = config('services.gmail.redirect_uri');
    }

    /**
     * Return the current user's Gmail integration status.
     */
    public function status(Request $request): JsonResponse
    {
        $integration = GmailIntegration::where('user_id', $request->user()->id)->first();

        if (! $integration || ! $integration->is_active) {
            return response()->json(['connected' => false]);
        }

        return response()->json([
            'connected' => true,
            'email' => $integration->google_account_email,
        ]);
    }

    /**
     * Initiate the Gmail OAuth flow.
     */
    public function connect(Request $request): JsonResponse
    {
        try {
            $state = Str::random(32);

            OAuthSession::create([
                'user_id' => $request->user()->id,
                'state' => $state,
                'expires_at' => now()->addHour(),
            ]);

            $authUrl = 'https://accounts.google.com/o/oauth2/auth?'.http_build_query([
                'client_id' => $this->clientId,
                'redirect_uri' => $this->redirectUri,
                'scope' => implode(' ', $this->scopes),
                'response_type' => 'code',
                'access_type' => 'offline',
                'prompt' => 'consent',
                'state' => $state,
            ]);

            return response()->json(['auth_url' => $authUrl]);
        } catch (Exception $e) {
            Log::error('Gmail OAuth initiation failed: '.$e->getMessage());

            return response()->json(['message' => 'Failed to initiate Gmail authorization.'], 500);
        }
    }

    /**
     * Handle the Gmail OAuth callback.
     */
    public function callback(Request $request)
    {
        $code = $request->get('code');
        $state = $request->get('state');

        if ($request->get('error') || ! $code || ! $state) {
            return redirect()->route('mail')
                ->with('error', 'Gmail authorization was denied or failed.');
        }

        $oauthSession = OAuthSession::where('state', $state)
            ->where('expires_at', '>', now())
            ->first();

        if (! $oauthSession) {
            return redirect()->route('mail')
                ->with('error', 'Invalid or expired OAuth session.');
        }

        try {
            $tokens = $this->gmailService->exchangeCodeForTokens($code, $this->redirectUri);
            $email = $this->gmailService->getAccountEmail($tokens['access_token']);

            GmailIntegration::updateOrCreate(
                ['user_id' => $oauthSession->user_id],
                [
                    'google_account_email' => $email,
                    'access_token' => $tokens['access_token'],
                    'refresh_token' => $tokens['refresh_token'] ?? null,
                    'token_expires_at' => now()->addSeconds($tokens['expires_in'] ?? 3600),
                    'is_active' => true,
                ]
            );

            $oauthSession->delete();

            return redirect()->route('mail')->with('success', "Gmail connected: {$email}");
        } catch (Exception $e) {
            Log::error('Gmail OAuth callback failed: '.$e->getMessage());
            $oauthSession->delete();

            return redirect()->route('mail')
                ->with('error', 'Failed to complete Gmail authorization.');
        }
    }

    /**
     * Disconnect Gmail integration.
     */
    public function disconnect(Request $request): JsonResponse
    {
        GmailIntegration::where('user_id', $request->user()->id)->delete();

        return response()->json(['success' => true]);
    }
}
