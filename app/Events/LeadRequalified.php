<?php

namespace App\Events;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadRequalified implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public Lead $lead,
        public User $requalifiedBy,
        public ?User $originalAdvisor = null,
        public string $reason = ''
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel("lead.{$this->lead->id}"),
        ];

        // Notify the CRO who originally qualified this lead
        if ($this->lead->qualified_by) {
            $channels[] = new PrivateChannel("user.{$this->lead->qualified_by}");
        }

        return $channels;
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'lead_id' => $this->lead->id,
            'lead_name' => $this->lead->name,
            'requalified_by_id' => $this->requalifiedBy->id,
            'requalified_by_name' => $this->requalifiedBy->name,
            'original_advisor_id' => $this->originalAdvisor?->id,
            'original_advisor_name' => $this->originalAdvisor?->name,
            'reason' => $this->reason,
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'lead.requalified';
    }
}
