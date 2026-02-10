<?php

namespace App\Events;

use App\Models\CallSession;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallInitiated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public CallSession $callSession
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('call-session.'.$this->callSession->session_id),
            new PrivateChannel('user.'.$this->callSession->caller_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'call.initiated';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->callSession->session_id,
            'caller' => [
                'id' => $this->callSession->caller_id,
                'name' => $this->callSession->caller->name ?? null,
            ],
            'call_type' => $this->callSession->call_type,
            'call_direction' => $this->callSession->call_direction,
            'status' => $this->callSession->status,
            'started_at' => $this->callSession->started_at?->toISOString(),
        ];
    }
}
