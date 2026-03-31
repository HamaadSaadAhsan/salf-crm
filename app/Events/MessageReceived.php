<?php

namespace App\Events;

use App\Models\Message;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Str;

class MessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  int[]  $recipientIds
     */
    public function __construct(
        public Message $message,
        public User $sender,
        public array $recipientIds,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return array_map(
            fn (int $id) => new PrivateChannel("user.{$id}"),
            $this->recipientIds,
        );
    }

    public function broadcastWith(): array
    {
        return [
            'message_id' => $this->message->id,
            'subject' => $this->message->subject,
            'preview' => Str::limit(strip_tags($this->message->body), 100),
            'sender_id' => $this->sender->id,
            'sender_name' => $this->sender->name,
            'sent_at' => $this->message->sent_at?->toIso8601String(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.received';
    }
}
