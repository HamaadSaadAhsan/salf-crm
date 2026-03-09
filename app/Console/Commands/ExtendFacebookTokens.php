<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExtendFacebookTokens extends Command
{
    protected $signature = 'facebook:extend-tokens
                           {--hours-before=48 : Hours before expiry to attempt extension}
                           {--dry-run : Show what would be done without extending}';

    protected $description = 'Extend Facebook access tokens before they expire by exchanging for long-lived tokens';

    public function handle(): int
    {
        $hoursBefore = (int) $this->option('hours-before');
        $dryRun = $this->option('dry-run');

        $this->info("Extending Facebook tokens expiring within {$hoursBefore} hours");

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No tokens will be extended');
        }

        $users = User::withFacebookTokenExpiringSoon($hoursBefore)->get();

        if ($users->isEmpty()) {
            $this->info('No tokens need extension.');

            return Command::SUCCESS;
        }

        $this->info("Found {$users->count()} token(s) to extend.");

        $extended = 0;
        $failed = 0;

        foreach ($users as $user) {
            $hoursLeft = now()->diffInHours($user->facebook_token_expires_at, false);
            $this->line("  Processing {$user->email} (expires in {$hoursLeft}h)...");

            if ($dryRun) {
                $this->line("    [DRY RUN] Would extend token for {$user->email}");

                continue;
            }

            if ($this->extendToken($user)) {
                $extended++;
                $this->info('    Token extended successfully.');
            } else {
                $failed++;
                $this->error('    Failed to extend token.');
            }
        }

        $this->line('');
        $this->info("Results: {$extended} extended, {$failed} failed out of {$users->count()} total.");

        Log::info('Facebook token extension completed', [
            'total' => $users->count(),
            'extended' => $extended,
            'failed' => $failed,
            'dry_run' => $dryRun,
        ]);

        return $failed > 0 ? Command::FAILURE : Command::SUCCESS;
    }

    private function extendToken(User $user): bool
    {
        $currentToken = $user->getFacebookAccessToken();

        if (! $currentToken) {
            Log::warning('No Facebook token to extend', ['user_id' => $user->id]);

            return false;
        }

        try {
            $apiVersion = config('services.facebook.api_version', 'v23.0');
            $clientId = config('services.facebook.app_id');
            $clientSecret = config('services.facebook.app_secret');

            // Exchange current token for a new long-lived token
            $response = Http::get("https://graph.facebook.com/{$apiVersion}/oauth/access_token", [
                'grant_type' => 'fb_exchange_token',
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'fb_exchange_token' => $currentToken,
            ]);

            if (! $response->successful()) {
                Log::error('Facebook token extension failed', [
                    'user_id' => $user->id,
                    'status' => $response->status(),
                    'response' => $response->body(),
                ]);

                return false;
            }

            $data = $response->json();
            $newToken = $data['access_token'] ?? null;
            $expiresIn = $data['expires_in'] ?? null;

            if (! $newToken) {
                Log::error('No access_token in Facebook extension response', [
                    'user_id' => $user->id,
                ]);

                return false;
            }

            // Update user tokens
            $user->updateFacebookTokens($newToken, null, $expiresIn);

            // Also refresh page tokens using the new long-lived user token
            $this->refreshPageTokens($user, $newToken, $apiVersion);

            Log::info('Facebook token extended', [
                'user_id' => $user->id,
                'new_expires_at' => $user->fresh()->facebook_token_expires_at,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Facebook token extension exception', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function refreshPageTokens(User $user, string $longLivedUserToken, string $apiVersion): void
    {
        try {
            $response = Http::get("https://graph.facebook.com/{$apiVersion}/me/accounts", [
                'access_token' => $longLivedUserToken,
                'fields' => 'id,name,access_token',
            ]);

            if (! $response->successful()) {
                Log::warning('Failed to refresh page tokens during extension', [
                    'user_id' => $user->id,
                ]);

                return;
            }

            $pages = $response->json('data', []);

            foreach ($pages as $pageData) {
                \App\Models\MetaPage::where('user_id', $user->id)
                    ->where('page_id', $pageData['id'])
                    ->update([
                        'access_token' => $pageData['access_token'] ?? '',
                        'last_updated' => now(),
                    ]);
            }

            Log::info('Page tokens refreshed during extension', [
                'user_id' => $user->id,
                'pages_refreshed' => count($pages),
            ]);
        } catch (\Exception $e) {
            Log::warning('Page token refresh failed during extension', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
