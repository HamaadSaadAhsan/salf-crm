<?php

namespace App\Events;

use App\Models\CallSession;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallAnswered implements ShouldBroadcast
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
        return 'call.answered';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->callSession->session_id,
            'status' => $this->callSession->status,
            'answered_at' => $this->callSession->answered_at?->toISOString(),
        ];
    }
}
