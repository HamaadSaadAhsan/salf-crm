<?php

namespace App\Events;

use App\Models\CallSession;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallEnded implements ShouldBroadcast
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
        return 'call.ended';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->callSession->session_id,
            'status' => $this->callSession->status,
            'end_reason' => $this->callSession->end_reason,
            'duration' => $this->callSession->duration,
            'answered_at' => $this->callSession->answered_at?->toISOString(),
            'ended_at' => $this->callSession->ended_at?->toISOString(),
        ];
    }
}
