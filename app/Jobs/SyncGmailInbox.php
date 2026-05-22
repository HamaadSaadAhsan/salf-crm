<?php

namespace App\Jobs;

use App\Events\MessageReceived;
use App\Exceptions\GmailInsufficientScopeException;
use App\Models\GmailIntegration;
use App\Models\Message;
use App\Models\MessageRecipient;
use App\Services\GmailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\UniqueConstraintViolationException;
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
        } catch (GmailInsufficientScopeException $e) {
            // Token lacks required scopes — disable the integration until user re-authorizes
            $integration->update(['is_active' => false]);
            Log::warning("Gmail integration disabled for user {$this->gmailIntegrationUserId}: insufficient scopes. User must reconnect.");

            return;
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

            // Match to existing thread by Gmail's threadId
            $threadId = $this->resolveThreadId($detail['gmail_thread_id']);
            $isReply = str_starts_with(strtolower($detail['subject']), 're:')
                || str_starts_with(strtolower($detail['subject']), 'fwd:');

            try {
                $message = Message::create([
                    'sender_id' => null,
                    'external_sender_name' => $detail['from_name'],
                    'external_sender_email' => $detail['from_email'],
                    'gmail_message_id' => $detail['gmail_id'],
                    'gmail_thread_id' => $detail['gmail_thread_id'],
                    'subject' => $detail['subject'],
                    'body' => $this->stripQuotedReply($detail['body']),
                    'type' => $isReply ? 'reply' : 'new',
                    'is_draft' => false,
                    'thread_id' => $threadId,
                    'sent_at' => $detail['sent_at'],
                ]);
            } catch (UniqueConstraintViolationException) {
                // Another concurrent job already imported this message — skip
                continue;
            }

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

    /**
     * Find an existing CRM thread_id by Gmail's conversation threadId.
     */
    private function resolveThreadId(?string $gmailThreadId): string
    {
        if ($gmailThreadId) {
            $existing = Message::where('gmail_thread_id', $gmailThreadId)
                ->whereNotNull('thread_id')
                ->orderBy('sent_at')
                ->first();

            if ($existing) {
                return $existing->thread_id;
            }
        }

        return Str::uuid()->toString();
    }

    /**
     * Remove quoted reply text (the "On ... wrote:" block and everything after).
     */
    private function stripQuotedReply(string $body): string
    {
        // Pattern: "On Mon, 1 Apr 2026 at 2:22 pm, Name <email> wrote:" followed by quoted text
        $cleaned = preg_replace('/\r?\nOn .+? wrote:\s*\r?\n>.*$/s', '', $body);

        // Also handle the non-">" style: "On ... wrote:\n" followed by remaining text
        if ($cleaned === $body) {
            $cleaned = preg_replace('/\r?\nOn .+? wrote:\s*$/s', '', $body);
        }

        return trim($cleaned ?? $body);
    }
}
