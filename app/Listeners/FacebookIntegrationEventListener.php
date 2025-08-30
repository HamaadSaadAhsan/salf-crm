<?php

namespace App\Listeners;

use App\Events\FacebookConnected;
use App\Events\FacebookDisconnected;
use App\Events\FacebookWebhookReceived;
use App\Events\FacebookDataSynced;
use App\Events\FacebookErrorOccurred;
use App\Events\FacebookHealthStatusChanged;
use App\Events\FacebookLeadProcessed;
use App\Jobs\SyncFacebookPageData;
use App\Models\Integration;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use App\Notifications\FacebookIntegrationAlert;

class FacebookIntegrationEventListener
{
    /**
     * Handle Facebook connection events
     */
    public function handleFacebookConnected(FacebookConnected $event): void
    {
        try {
            // Update integration status
            $integration = Integration::find($event->integrationId);
            if ($integration) {
                $integration->update([
                    'active' => true,
                    'last_connected_at' => now(),
                ]);

                // Start initial data sync
                SyncFacebookPageData::dispatch($integration->id, [
                    'sync_posts' => true,
                    'sync_comments' => true,
                    'sync_messages' => true,
                    'limit' => 100
                ]);

                // Cache connection status
                Cache::put("facebook_integration_{$integration->id}_status", 'connected', 3600);
            }

            Log::info('Facebook integration connected', [
                'integration_id' => $event->integrationId,
                'user_id' => $event->userId,
                'data' => $event->data
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle Facebook connected event', [
                'integration_id' => $event->integrationId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    /**
     * Handle Facebook disconnection events
     */
    public function handleFacebookDisconnected(FacebookDisconnected $event): void
    {
        try {
            // Update integration status
            $integration = Integration::find($event->integrationId);
            if ($integration) {
                $integration->update([
                    'active' => false,
                    'last_disconnected_at' => now(),
                ]);

                // Clear cached data
                Cache::forget("facebook_integration_{$integration->id}_status");
                Cache::forget("facebook_integration_{$integration->id}_health");
            }

            // Notify administrators
            $this->notifyAdministrators(
                'Facebook Integration Disconnected',
                "Facebook integration {$event->integrationId} has been disconnected. Reason: " . ($event->data['reason'] ?? 'Unknown'),
                'warning'
            );

            Log::warning('Facebook integration disconnected', [
                'integration_id' => $event->integrationId,
                'reason' => $event->data['reason'] ?? 'Unknown',
                'user_id' => $event->userId
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle Facebook disconnected event', [
                'integration_id' => $event->integrationId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle webhook events
     */
    public function handleWebhookReceived(FacebookWebhookReceived $event): void
    {
        try {
            // Update webhook statistics
            $cacheKey = "facebook_webhook_stats_{$event->integrationId}";
            $stats = Cache::get($cacheKey, ['count' => 0, 'last_received' => null]);
            $stats['count']++;
            $stats['last_received'] = now();
            Cache::put($cacheKey, $stats, 86400); // 24 hours

            Log::info('Facebook webhook received', [
                'integration_id' => $event->integrationId,
                'webhook_type' => $event->data['object'] ?? 'unknown',
                'entries_count' => count($event->data['entry'] ?? [])
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle webhook received event', [
                'integration_id' => $event->integrationId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle data sync events
     */
    public function handleDataSynced(FacebookDataSynced $event): void
    {
        try {
            // Update sync statistics
            $integration = Integration::find($event->integrationId);
            if ($integration) {
                $syncStats = $integration->config['sync_stats'] ?? [];
                $syncType = $event->data['sync_type'];
                
                $syncStats[$syncType] = [
                    'last_sync' => now()->toISOString(),
                    'synced_count' => $event->data['synced_count'] ?? 0,
                    'duration' => $event->data['duration'] ?? null,
                    'status' => 'success'
                ];

                $config = $integration->config;
                $config['sync_stats'] = $syncStats;
                $config['last_sync_at'] = now()->toISOString();

                $integration->update(['config' => $config]);

                // Update cache
                Cache::put("facebook_sync_{$integration->id}_{$syncType}", [
                    'status' => 'success',
                    'count' => $event->data['synced_count'] ?? 0,
                    'timestamp' => now()
                ], 3600);
            }

            Log::info('Facebook data synced', [
                'integration_id' => $event->integrationId,
                'sync_type' => $event->data['sync_type'],
                'synced_count' => $event->data['synced_count'] ?? 0,
                'duration' => $event->data['duration'] ?? null
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle data synced event', [
                'integration_id' => $event->integrationId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle error events
     */
    public function handleErrorOccurred(FacebookErrorOccurred $event): void
    {
        try {
            // Store error in integration config
            $integration = Integration::find($event->integrationId);
            if ($integration) {
                $config = $integration->config;
                $errors = $config['recent_errors'] ?? [];

                // Keep only the last 10 errors
                if (count($errors) >= 10) {
                    array_shift($errors);
                }

                $errors[] = [
                    'type' => $event->data['error_type'] ?? 'unknown',
                    'message' => $event->data['error_message'] ?? 'Unknown error',
                    'severity' => $event->data['severity'] ?? 'error',
                    'timestamp' => now()->toISOString(),
                    'resolved' => false
                ];

                $config['recent_errors'] = $errors;
                $integration->update(['config' => $config]);

                // Update health status
                if ($event->data['severity'] === 'error') {
                    $this->updateHealthStatus($integration, 'error');
                }
            }

            // Notify administrators for critical errors
            if (($event->data['severity'] ?? 'error') === 'error') {
                $this->notifyAdministrators(
                    'Facebook Integration Error',
                    "Error in Facebook integration {$event->integrationId}: " . $event->data['error_message'],
                    'error'
                );
            }

            Log::error('Facebook integration error occurred', [
                'integration_id' => $event->integrationId,
                'error_type' => $event->data['error_type'] ?? 'unknown',
                'error_message' => $event->data['error_message'] ?? 'Unknown error',
                'severity' => $event->data['severity'] ?? 'error'
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle error occurred event', [
                'integration_id' => $event->integrationId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle health status changes
     */
    public function handleHealthStatusChanged(FacebookHealthStatusChanged $event): void
    {
        try {
            // Update cached health status
            Cache::put(
                "facebook_integration_{$event->integrationId}_health",
                $event->data['health_status'],
                1800 // 30 minutes
            );

            // Check if status got worse
            $currentStatus = $event->data['health_status'];
            $previousStatus = $event->data['previous_status'];

            $hasHealthDegraded = $this->hasHealthDegraded($currentStatus, $previousStatus);

            if ($hasHealthDegraded) {
                $this->notifyAdministrators(
                    'Facebook Integration Health Degraded',
                    "Health status for Facebook integration {$event->integrationId} has degraded.",
                    'warning'
                );
            }

            Log::info('Facebook integration health status changed', [
                'integration_id' => $event->integrationId,
                'health_status' => $currentStatus,
                'previous_status' => $previousStatus
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle health status changed event', [
                'integration_id' => $event->integrationId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle lead processing events
     */
    public function handleLeadProcessed(FacebookLeadProcessed $event): void
    {
        try {
            // Update lead processing statistics
            $integration = Integration::find($event->integrationId);
            if ($integration) {
                $config = $integration->config;
                $leadStats = $config['lead_stats'] ?? [
                    'total_processed' => 0,
                    'created' => 0,
                    'updated' => 0,
                    'duplicates_skipped' => 0,
                    'last_processed_at' => null
                ];

                $leadStats['total_processed']++;
                $leadStats[$event->data['action'] ?? 'created']++;
                $leadStats['last_processed_at'] = now()->toISOString();

                $config['lead_stats'] = $leadStats;
                $integration->update(['config' => $config]);
            }

            Log::info('Facebook lead processed', [
                'integration_id' => $event->integrationId,
                'lead_id' => $event->data['lead_id'],
                'facebook_lead_id' => $event->data['facebook_lead_id'],
                'action' => $event->data['action'] ?? 'created',
                'form_name' => $event->data['form_name']
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to handle lead processed event', [
                'integration_id' => $event->integrationId,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Update integration health status
     */
    private function updateHealthStatus(Integration $integration, string $status): void
    {
        $config = $integration->config;
        $config['health_status'] = $status;
        $config['health_updated_at'] = now()->toISOString();
        $integration->update(['config' => $config]);
    }

    /**
     * Check if health status has degraded
     */
    private function hasHealthDegraded(array $current, array $previous): bool
    {
        $healthFields = ['api', 'webhooks', 'permissions'];
        
        foreach ($healthFields as $field) {
            $currentValue = $current[$field] ?? false;
            $previousValue = $previous[$field] ?? false;
            
            // If any field went from true to false, health degraded
            if ($previousValue && !$currentValue) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Notify administrators about integration issues
     */
    private function notifyAdministrators(string $title, string $message, string $level = 'info'): void
    {
        try {
            $administrators = User::role('admin')->get();
            
            foreach ($administrators as $admin) {
                Notification::send($admin, new FacebookIntegrationAlert($title, $message, $level));
            }
        } catch (\Exception $e) {
            Log::error('Failed to notify administrators', [
                'title' => $title,
                'message' => $message,
                'error' => $e->getMessage()
            ]);
        }
    }
}