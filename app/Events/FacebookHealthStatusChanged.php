<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class FacebookHealthStatusChanged extends FacebookIntegrationEvent implements ShouldBroadcast
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
        return 'facebook.health.changed';
    }

    public function broadcastWith(): array
    {
        return [
            'integration_id' => $this->integrationId,
            'health_status' => $this->data['health_status'] ?? [],
            'timestamp' => now()->toISOString(),
            'previous_status' => $this->data['previous_status'] ?? []
        ];
    }
}