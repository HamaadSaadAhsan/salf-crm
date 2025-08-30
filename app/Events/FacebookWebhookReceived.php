<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class FacebookWebhookReceived extends FacebookIntegrationEvent implements ShouldBroadcast
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
        return 'facebook.webhook.received';
    }

    public function broadcastWith(): array
    {
        return [
            'integration_id' => $this->integrationId,
            'webhook_type' => $this->data['object'] ?? 'unknown',
            'timestamp' => now()->toISOString(),
            'entries_count' => count($this->data['entry'] ?? [])
        ];
    }
}