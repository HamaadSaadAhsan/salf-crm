<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class FacebookErrorOccurred extends FacebookIntegrationEvent implements ShouldBroadcast
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
        return 'facebook.error.occurred';
    }

    public function broadcastWith(): array
    {
        return [
            'integration_id' => $this->integrationId,
            'error_type' => $this->data['error_type'] ?? 'unknown',
            'error_message' => $this->data['error_message'] ?? 'Unknown error',
            'timestamp' => now()->toISOString(),
            'severity' => $this->data['severity'] ?? 'error'
        ];
    }
}