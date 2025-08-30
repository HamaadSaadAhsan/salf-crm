<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class FacebookDisconnected extends FacebookIntegrationEvent implements ShouldBroadcast
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
        return 'facebook.disconnected';
    }

    public function broadcastWith(): array
    {
        return [
            'integration_id' => $this->integrationId,
            'status' => 'disconnected',
            'timestamp' => now()->toISOString(),
            'reason' => $this->data['reason'] ?? 'Unknown'
        ];
    }
}