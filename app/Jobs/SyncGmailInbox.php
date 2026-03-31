<?php

namespace App\Jobs;

use App\Events\MessageReceived;
use App\Models\GmailIntegration;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Services\GmailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SyncGmailInbox implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(
        public readonly int $gmailIntegrationUserId,
    ) {}

    public function handle(GmailService $gmailService): void
    {
        $integration = GmailIntegration::where('user_id', $this->gmailIntegrationUserId)
            ->where('is_active', true)
            ->first();

        if (! $integration) {
            return;
        }

        $since = $integration->last_synced_at ?? now()->subMinutes(10);

        try {
            $gmailIds = $gmailService->listInboxMessageIds($integration, $since);
        } catch (\Exception $e) {
            Log::warning("Gmail inbox list failed for user {$this->gmailIntegrationUserId}: {$e->getMessage()}");

            return;
        }

        $imported = 0;

        foreach ($gmailIds as $gmailId) {
            // Skip already-imported messages
            if (Message::where('gmail_message_id', $gmailId)->exists()) {
                continue;
            }

            try {
                $detail = $gmailService->getMessageDetail($integration, $gmailId);
            } catch (\Exception $e) {
                Log::warning("Gmail get message detail failed ({$gmailId}): {$e->getMessage()}");

                continue;
            }

            if (! $detail) {
                continue;
            }

            $message = Message::create([
                'sender_id' => null,
                'external_sender_name' => $detail['from_name'],
                'external_sender_email' => $detail['from_email'],
                'gmail_message_id' => $detail['gmail_id'],
                'subject' => $detail['subject'],
                'body' => $detail['body'],
                'type' => 'new',
                'is_draft' => false,
                'thread_id' => Str::uuid()->toString(),
                'sent_at' => $detail['sent_at'],
            ]);

            MessageRecipient::create([
                'message_id' => $message->id,
                'user_id' => $integration->user_id,
                'type' => 'to',
            ]);

            // Broadcast to the CRM user
            broadcast(new MessageReceived($message, $integration->user, [$integration->user_id]));

            $imported++;
        }

        $integration->update(['last_synced_at' => now()]);

        if ($imported > 0) {
            Log::info("Gmail sync: imported {$imported} messages for user {$this->gmailIntegrationUserId}");
        }
    }
}
