<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallStateChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $sessionId,
        public array $callData
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('call-session.'.$this->sessionId),
        ];

        // Also broadcast to the caller's user channel if caller_id exists
        if (isset($this->callData['caller_id'])) {
            $channels[] = new PrivateChannel('user.'.$this->callData['caller_id']);
        }

        // Also broadcast to the lead channel if lead_id exists
        if (isset($this->callData['lead_id'])) {
            $channels[] = new PrivateChannel('lead.'.$this->callData['lead_id']);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'call.state.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->sessionId,
            'status' => $this->callData['status'] ?? null,
            'caller_id' => $this->callData['caller_id'] ?? null,
            'lead_id' => $this->callData['lead_id'] ?? null,
            'end_reason' => $this->callData['end_reason'] ?? null,
            'timestamp' => now()->toISOString(),
        ];
    }
}
