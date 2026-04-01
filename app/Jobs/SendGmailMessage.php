<?php

namespace App\Jobs;

use App\Models\GmailIntegration;
use App\Models\Message;
use App\Services\GmailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendGmailMessage implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(
        public readonly int $messageId,
        public readonly int $userId,
        public readonly array $emailPayload,
    ) {}

    public function handle(GmailService $gmailService): void
    {
        // If the message was unsent (deleted), skip sending
        $message = Message::find($this->messageId);
        if (! $message) {
            Log::info("Gmail send skipped — message {$this->messageId} was unsent.");

            return;
        }

        $integration = GmailIntegration::where('user_id', $this->userId)
            ->where('is_active', true)
            ->first();

        if (! $integration) {
            return;
        }

        $result = $gmailService->sendEmail($integration, $this->emailPayload);

        if ($result) {
            $message->update([
                'gmail_message_id' => $result['id'],
                'gmail_thread_id' => $result['threadId'],
            ]);
        }
    }
}
