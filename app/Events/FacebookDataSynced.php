<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class FacebookDataSynced extends FacebookIntegrationEvent implements ShouldBroadcast
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
        return 'facebook.data.synced';
    }

    public function broadcastWith(): array
    {
        return [
            'integration_id' => $this->integrationId,
            'sync_type' => $this->data['sync_type'] ?? 'unknown',
            'synced_count' => $this->data['synced_count'] ?? 0,
            'timestamp' => now()->toISOString(),
            'duration' => $this->data['duration'] ?? null
        ];
    }
}