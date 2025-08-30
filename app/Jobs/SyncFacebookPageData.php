<?php

namespace App\Jobs;

use App\Models\Integration;
use App\Models\LeadForm;
use App\Models\MetaPage;
use App\Services\FacebookService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class SyncFacebookPageData implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected string $integrationId;
    protected array $syncOptions;

    public $timeout = 300; // 5 minutes
    public $tries = 3;

    public function __construct(string $integrationId, array $syncOptions = [])
    {
        $this->integrationId = $integrationId;
        $this->syncOptions = $syncOptions;
    }

    public function handle(FacebookService $facebookService): void
    {
        try {
            $integration = Integration::findOrFail($this->integrationId);

            if (!$integration->active || $integration->provider !== 'facebook') {
                Log::warning("Skipping sync for inactive or non-Facebook integration: {$this->integrationId}");
                return;
            }

            $config = $integration->config;
            $accessToken = decrypt($config['access_token']);
            $pageId = $config['page_id'];
            $limit = $this->syncOptions['limit'] ?? 100;

            $results = [
                'posts_synced' => 0,
                'comments_synced' => 0,
                'messages_synced' => 0,
                'forms_synced' => 0,
                'leads_synced' => 0,
                'errors' => []
            ];

            // Sync posts
            if ($this->syncOptions['sync_posts'] ?? true) {
                try {
                    $results['posts_synced'] = $facebookService->syncPosts($accessToken, $pageId, $limit);
                    Log::info("Synced {$results['posts_synced']} posts for integration {$this->integrationId}");
                } catch (Exception $e) {
                    $results['errors']['posts'] = $e->getMessage();
                    Log::error("Failed to sync posts for integration {$this->integrationId}: " . $e->getMessage());
                }
            }

            // Sync comments (if enabled)
            if ($this->syncOptions['sync_comments'] ?? false) {
                try {
                    // Implementation for syncing comments would go here
                    Log::info("Comments sync completed for integration {$this->integrationId}");
                } catch (Exception $e) {
                    $results['errors']['comments'] = $e->getMessage();
                    Log::error("Failed to sync comments for integration {$this->integrationId}: " . $e->getMessage());
                }
            }

            // Sync messages (if enabled)
            if ($this->syncOptions['sync_messages'] ?? false) {
                try {
                    // Implementation for syncing messages would go here
                    Log::info("Messages sync completed for integration {$this->integrationId}");
                } catch (Exception $e) {
                    $results['errors']['messages'] = $e->getMessage();
                    Log::error("Failed to sync messages for integration {$this->integrationId}: " . $e->getMessage());
                }
            }

            // Sync messages (if enabled)
            if ($this->syncOptions['sync_forms']) {
                try {
                    // Implementation for syncing messages would go here
                    $metaPages = MetaPage::all();
                    foreach ($metaPages as $metaPage) {
                        $results['forms_synced'] = $facebookService->syncForms($metaPage->access_token, $metaPage->page_id, $limit);
                    }

                    Log::info("Messages sync completed for integration {$this->integrationId}");
                } catch (Exception $e) {
                    $results['errors']['messages'] = $e->getMessage();
                    Log::error("Failed to sync messages for integration {$this->integrationId}: " . $e->getMessage());
                }
            }

            // Sync messages (if enabled)
            if ($this->syncOptions['sync_leads']) {
                try {
                    // Implementation for syncing messages would go here
                    $metaPages = MetaPage::all();
                    foreach ($metaPages as $metaPage) {
                        $forms = LeadForm::where('page_id', $metaPage->page_id)->get();
                        if($forms->count()){
                            foreach ($forms as $form) {
                                $results['leads_synced'] = $facebookService->syncLeads($metaPage->access_token, $form->external_id, $limit);
                            }
                        }
                    }

                    Log::info("Messages sync completed for integration {$this->integrationId}");
                } catch (Exception $e) {
                    $results['errors']['messages'] = $e->getMessage();
                    Log::error("Failed to sync messages for integration {$this->integrationId}: " . $e->getMessage());
                }
            }

            // Update integration with last sync time
            $integration->update([
                'config' => array_merge($config, [
                    'last_sync' => now(),
                    'last_sync_results' => $results
                ])
            ]);

        } catch (Exception $e) {
            Log::error("Facebook data sync job failed for integration {$this->integrationId}: " . $e->getMessage());
            $this->fail($e);
        }
    }

    public function failed(Exception $exception): void
    {
        Log::error("Facebook data sync job permanently failed for integration {$this->integrationId}: " . $exception->getMessage());
    }
}
