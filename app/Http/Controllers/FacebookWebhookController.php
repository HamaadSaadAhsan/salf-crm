<?php

namespace App\Http\Controllers;

use App\Models\Integration;
use App\Models\SocialMessage;
use App\Models\SocialPost;
use App\Models\SocialComment;
use App\Services\FacebookService;
use App\Events\FacebookWebhookReceived;
use App\Events\FacebookErrorOccurred;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Exception;

class FacebookWebhookController extends Controller
{
    protected FacebookService $facebookService;

    public function __construct(FacebookService $facebookService)
    {
        $this->facebookService = $facebookService;
    }

    /**
     * Verify webhook (Facebook challenge)
     */
    public function verify(Request $request)
    {
        $challenge = $request->get('hub_challenge');
        $token = $request->get('hub_verify_token');
        $mode = $request->get('hub_mode');

        \Log::info('Facebook webhook verify', [
            'mode' => $mode,
            'token' => $token,
            'challenge' => $challenge,
            'expected_token' => config('services.facebook.webhook_verify_token')
        ]);

        // Check verification token
        if ($mode === 'subscribe' && $token === config('services.facebook.webhook_verify_token')) {
            \Log::info('Verification successful, returning challenge: ' . $challenge);

            // Return the CHALLENGE value, not 'OK'
            return response($challenge, 200, ['Content-Type' => 'text/plain']);
        }

        \Log::warning('Verification failed');
        return response('Invalid verification token', 403);
    }

    // Simplified test endpoint
    public function test(Request $request)
    {
        \Log::info('Test endpoint called');
        return response('TEST_OK', 200, ['Content-Type' => 'text/plain']);
    }

    /**
     * Handle webhook events
     */
    public function handle(Request $request): Response
    {
        $payload = $request->all();

        Log::info('Facebook handle', $payload);

        try {

            Log::info('Facebook webhook received', ['payload' => $payload]);

            // Verify the request is from Facebook
            if (!$this->verifySignature($request)) {
                Log::warning('Facebook webhook signature verification failed');
                return response('Unauthorized', 401);
            }

            // Find the integration to get the correct ID for events
            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if ($integration) {
                // Emit webhook received event
                FacebookWebhookReceived::dispatch(
                    $integration->id,
                    $payload
                );
            }

            if (isset($payload['object']) && $payload['object'] === 'page') {
                foreach ($payload['entry'] as $entry) {
                    $this->processEntry($entry, $integration);
                }
            }

            return response('OK', 200);

        } catch (Exception $e) {
            Log::error('Facebook webhook processing error: ' . $e->getMessage(), [
                'payload' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);

            return response('Internal Server Error', 500);
        }
    }

    /**
     * Verify webhook signature
     */
    private function verifySignature(Request $request): bool
    {
        $signature = $request->header('X-Hub-Signature-256');

        if (!$signature) {
            return false;
        }

        $integration = Integration::where('provider', 'facebook')
            ->where('active', true)
            ->first();

        if (!$integration || !isset($integration->config['app_secret'])) {
            return false;
        }

        $appSecret = decrypt($integration->config['app_secret']);
        $payload = $request->getContent();
        $expectedSignature = 'sha256=' . hash_hmac('sha256', $payload, $appSecret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Process webhook entry
     */
    private function processEntry(array $entry, ?Integration $integration = null): void
    {

        $pageId = $entry['id'];
        $time = $entry['time'];

        // Process messaging events
        if (isset($entry['messaging'])) {
            foreach ($entry['messaging'] as $messagingEvent) {
                $this->processMessagingEvent($messagingEvent, $pageId, $time);
            }
        }

        // Process changes (posts, comments, etc.)
        if (isset($entry['changes'])) {
            foreach ($entry['changes'] as $change) {
                $this->processChange($change, $pageId, $time);
            }
        }
    }

    /**
     * Process messaging events
     */
    private function processMessagingEvent(array $event, string $pageId, int $time): void
    {
        try {
            $senderId = $event['sender']['id'];
            $recipientId = $event['recipient']['id'];

            // Handle regular messages
            if (isset($event['message'])) {
                $message = $event['message'];

                SocialMessage::updateOrCreate(
                    [
                        'provider' => 'facebook',
                        'provider_id' => $message['mid']
                    ],
                    [
                        'message' => $message['text'] ?? '',
                        'timestamp' => \Carbon\Carbon::createFromTimestamp($time),
                        'metadata' => [
                            'sender_id' => $senderId,
                            'recipient_id' => $recipientId,
                            'page_id' => $pageId,
                            'direction' => 'inbound',
                            'has_attachments' => isset($message['attachments']),
                            'attachments' => $message['attachments'] ?? null
                        ]
                    ]
                );

                Log::info('Processed Facebook message', [
                    'message_id' => $message['mid'],
                    'sender_id' => $senderId,
                    'page_id' => $pageId
                ]);
            }

            // Handle postbacks
            if (isset($event['postback'])) {
                $postback = $event['postback'];

                SocialMessage::create([
                    'provider' => 'facebook',
                    'provider_id' => uniqid('postback_'),
                    'message' => $postback['title'] ?? 'Postback',
                    'timestamp' => \Carbon\Carbon::createFromTimestamp($time),
                    'metadata' => [
                        'sender_id' => $senderId,
                        'recipient_id' => $recipientId,
                        'page_id' => $pageId,
                        'type' => 'postback',
                        'payload' => $postback['payload'] ?? null
                    ]
                ]);

                Log::info('Processed Facebook postback', [
                    'sender_id' => $senderId,
                    'payload' => $postback['payload'] ?? null,
                    'page_id' => $pageId
                ]);
            }

        } catch (Exception $e) {
            Log::error('Error processing messaging event: ' . $e->getMessage(), [
                'event' => $event,
                'page_id' => $pageId
            ]);
        }
    }

    /**
     * Process change events (posts, comments, etc.)
     */
    private function processChange(array $change, string $pageId, int $time): void
    {

        try {
            $field = $change['field'];
            $value = $change['value'];

            switch ($field) {
                case 'feed':
                    $this->processFeedChange($value, $pageId, $time);
                    break;

                case 'comments':
                    $this->processCommentChange($value, $pageId, $time);
                    break;

                case 'reactions':
                    $this->processReactionChange($value, $pageId, $time);
                    break;

                default:
                    Log::info('Unhandled Facebook webhook field', [
                        'field' => $field,
                        'value' => $value,
                        'page_id' => $pageId
                    ]);
            }

        } catch (Exception $e) {
            Log::error('Error processing change event: ' . $e->getMessage(), [
                'change' => $change,
                'page_id' => $pageId
            ]);
        }
    }

    /**
     * Process feed changes (new posts)
     */
    private function processFeedChange(array $value, string $pageId, int $time): void
    {
        set_time_limit(30);

        if ($value['verb'] === 'add' && isset($value['post_id'])) {
            // Fetch full post data from API if needed
            $integration = Integration::where('provider', 'facebook')
                ->where('active', true)
                ->first();

            if ($integration) {
                try {
                    $accessToken = decrypt($integration->config['access_token']);

                    // Fetch post details
                    $response = \Illuminate\Support\Facades\Http::get(
                        "https://graph.facebook.com/v18.0/{$value['post_id']}", [
                            'access_token' => $accessToken,
                            'fields' => 'id,message,created_time,type,link,picture'
                        ]
                    );

                    if ($response->successful()) {
                        $postData = $response->json();

                        SocialPost::updateOrCreate(
                            [
                                'provider' => 'facebook',
                                'provider_id' => $postData['id']
                            ],
                            [
                                'content' => $postData['message'] ?? '',
                                'author_id' => $pageId,
                                'timestamp' => $postData['created_time'],
                                'metadata' => [
                                    'type' => $postData['type'] ?? null,
                                    'link' => $postData['link'] ?? null,
                                    'picture' => $postData['picture'] ?? null,
                                    'webhook_triggered' => true
                                ]
                            ]
                        );

                        Log::info('Processed Facebook post via webhook', [
                            'post_id' => $postData['id'],
                            'page_id' => $pageId
                        ]);
                    }
                } catch (Exception $e) {
                    Log::error('Error fetching post data: ' . $e->getMessage());
                }
            }
        }
    }

    /**
     * Process comment changes
     */
    private function processCommentChange(array $value, string $pageId, int $time): void
    {

        if ($value['verb'] === 'add' && isset($value['comment_id'])) {
            SocialComment::updateOrCreate(
                [
                    'provider' => 'facebook',
                    'provider_id' => $value['comment_id']
                ],
                [
                    'post_id' => $value['post_id'] ?? '',
                    'content' => $value['message'] ?? '',
                    'author_id' => $value['from']['id'] ?? '',
                    'author_name' => $value['from']['name'] ?? '',
                    'timestamp' => \Carbon\Carbon::createFromTimestamp($time),
                    'metadata' => [
                        'page_id' => $pageId,
                        'parent_id' => $value['parent_id'] ?? null,
                        'webhook_triggered' => true
                    ]
                ]
            );

            Log::info('Processed Facebook comment via webhook', [
                'comment_id' => $value['comment_id'],
                'post_id' => $value['post_id'] ?? '',
                'page_id' => $pageId
            ]);
        }
    }

    /**
     * Process reaction changes
     */
    private function processReactionChange(array $value, string $pageId, int $time): void
    {

        // Log reaction for analytics but don't store in database
        Log::info('Facebook reaction event', [
            'reaction_type' => $value['reaction_type'] ?? 'like',
            'post_id' => $value['post_id'] ?? '',
            'parent_id' => $value['parent_id'] ?? null,
            'page_id' => $pageId
        ]);
    }
}
