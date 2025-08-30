<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class FacebookConnected extends FacebookIntegrationEvent implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->userId}.facebook-integration"),
            new PrivateChannel("integration.{$this->integrationId}")
        ];
    }

    public function broadcastAs(): string
    {
        return 'facebook.connected';
    }

    public function broadcastWith(): array
    {
        return [
            'integration_id' => $this->integrationId,
            'status' => 'connected',
            'timestamp' => now()->toISOString(),
            'data' => $this->data
        ];
    }
}