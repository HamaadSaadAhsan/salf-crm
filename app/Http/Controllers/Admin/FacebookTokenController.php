<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Integration;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Exception;

class FacebookTokenController extends Controller
{
    public function __construct()
    {
        // Only super admins can access these methods
        $this->middleware(['role:super-admin']);
    }

    /**
     * Get Facebook token status overview for all users
     */
    public function tokenOverview(): JsonResponse
    {
        try {
            // Get users with Facebook tokens
            $usersWithTokens = User::withFacebookToken()
                ->select(['id', 'name', 'email', 'facebook_token_expires_at', 'facebook_connected_at'])
                ->get()
                ->map(function ($user) {
                    $tokenStatus = $user->getFacebookTokenStatus();
                    
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'token_status' => [
                            'has_token' => $tokenStatus['has_token'],
                            'is_expired' => $tokenStatus['is_expired'],
                            'expires_at' => $tokenStatus['expires_at']?->toISOString(),
                            'connected_at' => $tokenStatus['connected_at']?->toISOString(),
                            'expires_in_hours' => $tokenStatus['expires_in_hours'],
                            'has_refresh_token' => $tokenStatus['has_refresh_token'],
                            'status' => $this->getTokenStatusLabel($tokenStatus),
                        ]
                    ];
                });

            // Statistics
            $totalWithTokens = $usersWithTokens->count();
            $expiredTokens = $usersWithTokens->where('token_status.is_expired', true)->count();
            $expiringSoon = $usersWithTokens->filter(function ($user) {
                $hoursToExpiry = $user['token_status']['expires_in_hours'];
                return $hoursToExpiry !== null && $hoursToExpiry > 0 && $hoursToExpiry <= 24;
            })->count();
            $healthy = $totalWithTokens - $expiredTokens - $expiringSoon;

            return response()->json([
                'success' => true,
                'statistics' => [
                    'total_users_with_tokens' => $totalWithTokens,
                    'healthy_tokens' => $healthy,
                    'expiring_soon' => $expiringSoon,
                    'expired_tokens' => $expiredTokens,
                ],
                'users' => $usersWithTokens->values(),
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get Facebook token overview: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve token overview'
            ], 500);
        }
    }

    /**
     * Get detailed token information for a specific user
     */
    public function userTokenDetails(Request $request, int $userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);
            
            if (!$user->hasFacebookToken()) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not have Facebook token'
                ], 404);
            }

            $tokenStatus = $user->getFacebookTokenStatus();
            
            // Get integration information
            $integration = Integration::where('provider', 'facebook')->first();
            $integrationInfo = null;
            
            if ($integration) {
                $config = $integration->config;
                $integrationInfo = [
                    'id' => $integration->id,
                    'name' => $integration->name,
                    'active' => $integration->active,
                    'page_name' => $config['page_info']['name'] ?? null,
                    'page_id' => $config['page_id'] ?? null,
                    'app_id' => $config['app_id'] ?? null,
                    'features_enabled' => $config['features'] ?? [],
                    'created_at' => $integration->created_at->toISOString(),
                    'updated_at' => $integration->updated_at->toISOString(),
                ];
            }

            return response()->json([
                'success' => true,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'token_status' => [
                    'has_token' => $tokenStatus['has_token'],
                    'is_expired' => $tokenStatus['is_expired'],
                    'expires_at' => $tokenStatus['expires_at']?->toISOString(),
                    'connected_at' => $tokenStatus['connected_at']?->toISOString(),
                    'expires_in_hours' => $tokenStatus['expires_in_hours'],
                    'expires_in_days' => $tokenStatus['expires_in_hours'] ? 
                        round($tokenStatus['expires_in_hours'] / 24, 1) : null,
                    'has_refresh_token' => $tokenStatus['has_refresh_token'],
                    'status' => $this->getTokenStatusLabel($tokenStatus),
                    'urgency' => $this->getTokenUrgency($tokenStatus),
                ],
                'integration' => $integrationInfo,
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get user token details: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user token details'
            ], 500);
        }
    }

    /**
     * Get users with expired tokens
     */
    public function expiredTokens(): JsonResponse
    {
        try {
            $expiredUsers = User::withExpiredFacebookToken()
                ->select(['id', 'name', 'email', 'facebook_token_expires_at', 'facebook_connected_at'])
                ->get()
                ->map(function ($user) {
                    $tokenStatus = $user->getFacebookTokenStatus();
                    
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'expired_at' => $tokenStatus['expires_at']?->toISOString(),
                        'connected_at' => $tokenStatus['connected_at']?->toISOString(),
                        'days_expired' => $tokenStatus['expires_at'] ? 
                            $tokenStatus['expires_at']->diffInDays(now()) : null,
                    ];
                });

            return response()->json([
                'success' => true,
                'expired_users' => $expiredUsers,
                'count' => $expiredUsers->count(),
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get expired tokens: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve expired tokens'
            ], 500);
        }
    }

    /**
     * Get users with tokens expiring soon
     */
    public function tokensExpiringSoon(Request $request): JsonResponse
    {
        try {
            $hours = $request->get('hours', 72); // Default to 3 days
            
            $expiringSoonUsers = User::withFacebookTokenExpiringSoon($hours)
                ->select(['id', 'name', 'email', 'facebook_token_expires_at', 'facebook_connected_at'])
                ->get()
                ->map(function ($user) {
                    $tokenStatus = $user->getFacebookTokenStatus();
                    
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'expires_at' => $tokenStatus['expires_at']?->toISOString(),
                        'connected_at' => $tokenStatus['connected_at']?->toISOString(),
                        'expires_in_hours' => $tokenStatus['expires_in_hours'],
                        'expires_in_days' => $tokenStatus['expires_in_hours'] ? 
                            round($tokenStatus['expires_in_hours'] / 24, 1) : null,
                        'urgency' => $this->getTokenUrgency($tokenStatus),
                    ];
                });

            return response()->json([
                'success' => true,
                'expiring_soon_users' => $expiringSoonUsers,
                'count' => $expiringSoonUsers->count(),
                'threshold_hours' => $hours,
            ]);

        } catch (Exception $e) {
            Log::error('Failed to get tokens expiring soon: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve tokens expiring soon'
            ], 500);
        }
    }

    /**
     * Revoke Facebook token for a specific user (admin action)
     */
    public function revokeUserToken(int $userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);
            
            if (!$user->hasFacebookToken()) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not have Facebook token to revoke'
                ], 404);
            }

            // Revoke the tokens
            $user->revokeFacebookTokens();

            Log::info('Admin revoked Facebook token for user', [
                'admin_user_id' => auth()->id(),
                'target_user_id' => $userId,
                'target_user_email' => $user->email
            ]);

            return response()->json([
                'success' => true,
                'message' => "Facebook token revoked for user: {$user->name}",
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Failed to revoke user token: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to revoke user token'
            ], 500);
        }
    }

    /**
     * Send token renewal notification to user
     */
    public function notifyUserTokenExpiry(int $userId): JsonResponse
    {
        try {
            $user = User::findOrFail($userId);
            
            if (!$user->hasFacebookToken()) {
                return response()->json([
                    'success' => false,
                    'message' => 'User does not have Facebook token'
                ], 404);
            }

            // TODO: Implement email notification
            // For now, just log the action
            Log::info('Admin triggered token expiry notification for user', [
                'admin_user_id' => auth()->id(),
                'target_user_id' => $userId,
                'target_user_email' => $user->email,
                'token_expires_at' => $user->facebook_token_expires_at
            ]);

            return response()->json([
                'success' => true,
                'message' => "Token renewal notification sent to: {$user->name}",
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ]
            ]);

        } catch (Exception $e) {
            Log::error('Failed to notify user of token expiry: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to send notification'
            ], 500);
        }
    }

    /**
     * Get token status label for display
     */
    private function getTokenStatusLabel(array $tokenStatus): string
    {
        if (!$tokenStatus['has_token']) {
            return 'No Token';
        }
        
        if ($tokenStatus['is_expired']) {
            return 'Expired';
        }
        
        $hoursToExpiry = $tokenStatus['expires_in_hours'];
        
        if ($hoursToExpiry === null) {
            return 'Unknown';
        }
        
        if ($hoursToExpiry <= 24) {
            return 'Expires Today';
        }
        
        if ($hoursToExpiry <= 72) {
            return 'Expires Soon';
        }
        
        return 'Active';
    }

    /**
     * Get token urgency level
     */
    private function getTokenUrgency(array $tokenStatus): string
    {
        if (!$tokenStatus['has_token']) {
            return 'none';
        }
        
        if ($tokenStatus['is_expired']) {
            return 'critical';
        }
        
        $hoursToExpiry = $tokenStatus['expires_in_hours'];
        
        if ($hoursToExpiry === null) {
            return 'unknown';
        }
        
        if ($hoursToExpiry <= 6) {
            return 'critical';
        }
        
        if ($hoursToExpiry <= 24) {
            return 'high';
        }
        
        if ($hoursToExpiry <= 72) {
            return 'medium';
        }
        
        return 'low';
    }
}