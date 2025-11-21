<?php

namespace App\Events;

use App\Models\SipAccount;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SipAccountRegistered implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SipAccount $sipAccount
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.'.$this->sipAccount->user_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'sip.account.registered';
    }

    public function broadcastWith(): array
    {
        return [
            'account_id' => $this->sipAccount->id,
            'username' => $this->sipAccount->username,
            'domain' => $this->sipAccount->domain,
            'status' => $this->sipAccount->status,
            'registered_at' => $this->sipAccount->last_registered_at?->toISOString(),
        ];
    }
}
