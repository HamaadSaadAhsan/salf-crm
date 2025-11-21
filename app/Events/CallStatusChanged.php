<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public string $status,
        public ?int $leadId = null,
        public ?string $endReason = null
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('call-session.'.$this->sessionId),
        ];

        // Also broadcast to the lead channel if lead_id exists
        if ($this->leadId) {
            $channels[] = new PrivateChannel('lead.'.$this->leadId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'call.status.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->sessionId,
            'status' => $this->status,
            'lead_id' => $this->leadId,
            'end_reason' => $this->endReason,
            'timestamp' => now()->toISOString(),
        ];
    }
}
