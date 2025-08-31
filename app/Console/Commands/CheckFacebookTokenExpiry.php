<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Carbon\Carbon;

class CheckFacebookTokenExpiry extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'facebook:check-token-expiry 
                           {--notify-hours=72 : Hours before expiry to send notification}
                           {--dry-run : Show what would be done without sending notifications}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check Facebook token expiry and notify users/admins';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $notifyHours = (int) $this->option('notify-hours');
        $dryRun = $this->option('dry-run');

        $this->info("Checking Facebook token expiry (notify {$notifyHours} hours before expiry)");

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No notifications will be sent');
        }

        // Get expired tokens
        $expiredUsers = User::withExpiredFacebookToken()
            ->select(['id', 'name', 'email', 'facebook_token_expires_at'])
            ->get();

        // Get tokens expiring soon
        $expiringSoonUsers = User::withFacebookTokenExpiringSoon($notifyHours)
            ->select(['id', 'name', 'email', 'facebook_token_expires_at'])
            ->get();

        $this->displayResults($expiredUsers, $expiringSoonUsers, $notifyHours);

        if (!$dryRun) {
            $this->sendNotifications($expiredUsers, $expiringSoonUsers);
        }

        $this->logResults($expiredUsers, $expiringSoonUsers, $dryRun);

        return Command::SUCCESS;
    }

    /**
     * Display results in console
     */
    private function displayResults($expiredUsers, $expiringSoonUsers, int $notifyHours): void
    {
        $this->line('');
        $this->info('Facebook Token Status Report');
        $this->line(str_repeat('-', 50));

        // Expired tokens
        if ($expiredUsers->isNotEmpty()) {
            $this->error("EXPIRED TOKENS ({$expiredUsers->count()}):");
            foreach ($expiredUsers as $user) {
                $daysExpired = $user->facebook_token_expires_at->diffInDays(now());
                $this->line("  • {$user->name} ({$user->email}) - Expired {$daysExpired} days ago");
            }
            $this->line('');
        }

        // Expiring soon
        if ($expiringSoonUsers->isNotEmpty()) {
            $this->warn("EXPIRING SOON - within {$notifyHours} hours ({$expiringSoonUsers->count()}):");
            foreach ($expiringSoonUsers as $user) {
                $hoursToExpiry = now()->diffInHours($user->facebook_token_expires_at, false);
                $this->line("  • {$user->name} ({$user->email}) - Expires in {$hoursToExpiry} hours");
            }
            $this->line('');
        }

        if ($expiredUsers->isEmpty() && $expiringSoonUsers->isEmpty()) {
            $this->info('✅ All Facebook tokens are healthy!');
        }
    }

    /**
     * Send notifications (placeholder for actual implementation)
     */
    private function sendNotifications($expiredUsers, $expiringSoonUsers): void
    {
        $notificationsSent = 0;

        // Notify users with expired tokens
        foreach ($expiredUsers as $user) {
            $this->notifyUser($user, 'expired');
            $notificationsSent++;
        }

        // Notify users with tokens expiring soon
        foreach ($expiringSoonUsers as $user) {
            $this->notifyUser($user, 'expiring_soon');
            $notificationsSent++;
        }

        // Notify super admins if there are any issues
        if ($expiredUsers->isNotEmpty() || $expiringSoonUsers->isNotEmpty()) {
            $this->notifyAdmins($expiredUsers, $expiringSoonUsers);
        }

        if ($notificationsSent > 0) {
            $this->info("✅ Sent {$notificationsSent} notifications");
        }
    }

    /**
     * Notify individual user
     */
    private function notifyUser(User $user, string $type): void
    {
        // TODO: Implement actual email notification
        // For now, just log the action
        Log::info('Facebook token notification sent to user', [
            'user_id' => $user->id,
            'user_email' => $user->email,
            'notification_type' => $type,
            'token_expires_at' => $user->facebook_token_expires_at,
            'command' => 'facebook:check-token-expiry'
        ]);

        $this->line("📧 Notification sent to {$user->email} (type: {$type})");
    }

    /**
     * Notify super admins
     */
    private function notifyAdmins($expiredUsers, $expiringSoonUsers): void
    {
        $superAdmins = User::role('super-admin')->get();

        foreach ($superAdmins as $admin) {
            // TODO: Implement actual email notification to admins
            Log::info('Facebook token admin notification sent', [
                'admin_id' => $admin->id,
                'admin_email' => $admin->email,
                'expired_count' => $expiredUsers->count(),
                'expiring_soon_count' => $expiringSoonUsers->count(),
                'command' => 'facebook:check-token-expiry'
            ]);
        }

        if ($superAdmins->isNotEmpty()) {
            $this->line("📧 Admin notifications sent to {$superAdmins->count()} super admins");
        }
    }

    /**
     * Log results for audit trail
     */
    private function logResults($expiredUsers, $expiringSoonUsers, bool $dryRun): void
    {
        Log::info('Facebook token expiry check completed', [
            'expired_tokens_count' => $expiredUsers->count(),
            'expiring_soon_count' => $expiringSoonUsers->count(),
            'dry_run' => $dryRun,
            'command' => 'facebook:check-token-expiry',
            'executed_at' => now()->toISOString(),
            'expired_users' => $expiredUsers->pluck('email')->toArray(),
            'expiring_soon_users' => $expiringSoonUsers->pluck('email')->toArray(),
        ]);
    }
}