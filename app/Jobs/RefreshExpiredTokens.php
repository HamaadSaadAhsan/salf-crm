<?php
namespace App\Jobs;

use App\Models\CalendarIntegration;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RefreshExpiredTokens implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        // Find integrations with tokens expiring in the next hour
        $expiringSoon = CalendarIntegration::where('is_active', true)
            ->where('token_expires_at', '<=', now()->addHour())
            ->where('token_expires_at', '>', now())
            ->whereNotNull('refresh_token')
            ->get();

        foreach ($expiringSoon as $integration) {
            try {
                $this->refreshToken($integration);
                Log::info("Successfully refreshed token for integration {$integration->id}");
            } catch (\Exception $e) {
                Log::error("Failed to refresh token for integration {$integration->id}: " . $e->getMessage());

                // Optionally deactivate integration if refresh fails
                $integration->update(['is_active' => false]);
            }
        }
    }

    /**
     * @throws ConnectionException
     * @throws \Exception
     */
    private function refreshToken(CalendarIntegration $integration): void
    {
        $response = Http::post('https://oauth2.googleapis.com/token', [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $integration->refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to refresh access token');
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
