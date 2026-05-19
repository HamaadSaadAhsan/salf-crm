<?php

namespace App\Jobs;

use App\Events\FacebookAutoSetupProgress;
use App\Models\MetaPage;
use App\Models\User;
use App\Models\Workflow;
use App\Services\FacebookService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AutoSetupFacebookJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $backoff = 5;

    public function __construct(
        public int $userId,
        public int $workflowId,
    ) {}

    public function handle(FacebookService $facebookService): void
    {
        $user = User::find($this->userId);
        $workflow = Workflow::find($this->workflowId);

        if (! $user || ! $workflow) {
            Log::warning('AutoSetupFacebookJob: user or workflow not found', [
                'user_id' => $this->userId,
                'workflow_id' => $this->workflowId,
            ]);

            return;
        }

        $accessToken = $user->getFacebookAccessToken();

        if (! $accessToken) {
            $this->broadcastProgress('failed', 'No Facebook access token found');

            return;
        }

        $apiVersion = config('services.facebook.api_version', 'v23.0');

        // 1. Sync pages
        $this->broadcastProgress('running', 'Syncing Facebook pages...');

        try {
            $pagesResponse = Http::get("https://graph.facebook.com/{$apiVersion}/me/accounts", [
                'access_token' => $accessToken,
                'fields' => 'id,name,category,access_token',
            ]);

            if (! $pagesResponse->successful()) {
                $this->broadcastProgress('failed', 'Failed to fetch pages from Facebook');

                return;
            }
        } catch (\Exception $e) {
            Log::error('AutoSetupFacebookJob: failed to fetch pages', ['error' => $e->getMessage()]);
            $this->broadcastProgress('failed', 'Failed to connect to Facebook');

            return;
        }

        $pagesData = $pagesResponse->json('data', []);
        $pages = [];

        foreach ($pagesData as $pageData) {
            $page = MetaPage::updateOrCreate(
                ['user_id' => $user->id, 'page_id' => $pageData['id']],
                [
                    'team_id' => $user->current_team_id,
                    'name' => $pageData['name'],
                    'access_token' => $pageData['access_token'] ?? '',
                    'last_updated' => now(),
                ]
            );

            // 2. Subscribe webhooks (skip if already subscribed)
            if (! $page->webhook_subscribed_at && $workflow->webhook_token) {
                $this->broadcastProgress('running', "Subscribing webhooks for {$page->name}...");

                try {
                    $result = $facebookService->subscribeToWebhook(
                        $page->access_token,
                        $page->page_id,
                        ['leadgen', 'feed'],
                        $workflow->webhook_url,
                        $workflow->webhook_token,
                    );
                    if ($result['success'] ?? false) {
                        $page->update(['webhook_subscribed_at' => now()]);
                    }
                } catch (\Exception $e) {
                    Log::warning('AutoSetupFacebookJob: webhook subscription failed', [
                        'page_id' => $page->page_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // 3. Subscribe app (skip if already subscribed)
            if (! $page->app_subscribed_at) {
                $this->broadcastProgress('running', "Subscribing app for {$page->name}...");

                try {
                    $appResponse = Http::post(
                        "https://graph.facebook.com/{$apiVersion}/{$page->page_id}/subscribed_apps",
                        [
                            'access_token' => $page->access_token,
                            'subscribed_fields' => 'leadgen,feed',
                        ]
                    );
                    if ($appResponse->successful()) {
                        $page->update(['app_subscribed_at' => now()]);
                    }
                } catch (\Exception $e) {
                    Log::warning('AutoSetupFacebookJob: app subscription failed', [
                        'page_id' => $page->page_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $pages[] = [
                'id' => $pageData['id'],
                'name' => $pageData['name'],
                'category' => $pageData['category'] ?? null,
            ];
        }

        $this->broadcastProgress('completed', count($pages).' pages synced and subscribed', [
            'pages' => $pages,
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function broadcastProgress(string $status, string $message, array $data = []): void
    {
        event(new FacebookAutoSetupProgress(
            $this->workflowId,
            $status,
            $message,
            $data,
        ));
    }
}
