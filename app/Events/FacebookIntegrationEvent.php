<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

abstract class FacebookIntegrationEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $integrationId,
        public array $data = [],
        public ?string $userId = null
    ) {
        $this->userId = $userId ?? auth()->id();
    }
}

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