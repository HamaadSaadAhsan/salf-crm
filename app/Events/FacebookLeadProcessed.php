<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;

class FacebookLeadProcessed extends FacebookIntegrationEvent implements ShouldBroadcast
{
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->userId}.facebook-integration"),
            new PrivateChannel("integration.{$this->integrationId}"),
            new PrivateChannel("leads.new") // Global channel for new leads
        ];
    }

    public function broadcastAs(): string
    {
        return 'facebook.lead.processed';
    }

    public function broadcastWith(): array
    {
        return [
            'integration_id' => $this->integrationId,
            'lead_id' => $this->data['lead_id'] ?? null,
            'facebook_lead_id' => $this->data['facebook_lead_id'] ?? null,
            'form_name' => $this->data['form_name'] ?? null,
            'action_taken' => $this->data['action'] ?? 'created',
            'timestamp' => now()->toISOString()
        ];
    }
}