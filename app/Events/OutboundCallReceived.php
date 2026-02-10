<?php

namespace App\Events;

use App\Models\Lead;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OutboundCallReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $event,
        public string $agentExtension,
        public string $clientNumber,
        public string $uniqueid,
        public ?string $linkedid = null,
        public ?string $sessionId = null,
        public ?Lead $lead = null,
        public string $callDirection = 'outbound',
        public ?string $phase = null,
        public ?string $dialstatus = null,
        public ?int $duration = null
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('outbound-calls'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'outbound.call';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        // Refresh lead to ensure casts are applied
        if ($this->lead && ! $this->lead->relationLoaded('service')) {
            $this->lead->load(['service', 'assignedTo', 'source']);
        }

        return [
            'event' => $this->event,
            'agent_extension' => $this->agentExtension,
            'uniqueid' => $this->uniqueid,
            'linkedid' => $this->linkedid,
            'sessionId' => $this->sessionId,
            'call_direction' => $this->callDirection,
            'direction' => $this->callDirection,
            'phase' => $this->phase,
            'dialstatus' => $this->dialstatus,
            'duration' => $this->duration,
            'lead' => $this->lead ? [
                'id' => $this->lead->id,
                'name' => $this->lead->name,
                'email' => $this->lead->email,
                'city' => $this->lead->city,
                'country' => $this->lead->country,
                'service' => $this->lead->service ? [
                    'id' => $this->lead->service_id,
                    'name' => $this->lead->service->name,
                ] : null,
                'assigned_to' => $this->lead->assignedTo ? [
                    'id' => $this->lead->assigned_to,
                    'name' => $this->lead->assignedTo->name,
                ] : null,
                'inquiry_status' => $this->lead->inquiry_status,
                'priority' => $this->lead->priority,
                'detail' => $this->lead->detail,
                'budget' => $this->getBudgetValue(),
                'tags' => $this->lead->tags,
                'lead_score' => $this->lead->lead_score,
                'last_activity_at' => $this->lead->last_activity_at?->toISOString(),
            ] : null,
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * Get budget value ensuring proper casting
     */
    private function getBudgetValue(): ?array
    {
        if (! $this->lead) {
            return null;
        }

        $budget = $this->lead->getAttribute('budget');

        if (is_null($budget)) {
            return null;
        }

        // If already an array, return it
        if (is_array($budget)) {
            return $budget;
        }

        // If string, decode it
        if (is_string($budget)) {
            $decoded = json_decode($budget, true);

            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }
}
