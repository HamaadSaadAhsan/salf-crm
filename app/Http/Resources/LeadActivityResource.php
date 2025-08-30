<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadActivityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'lead_id' => $this->lead_id,
            'user_id' => $this->user_id,
            'type' => $this->type,
            'status' => $this->status,
            'subject' => $this->subject,
            'description' => $this->description,
            'metadata' => $this->metadata,
            'priority' => $this->priority,
            'category' => $this->category,
            'duration_minutes' => $this->duration_minutes,
            'formatted_duration' => $this->formatted_duration,
            'cost' => $this->cost,
            'outcome' => $this->outcome,
            'notes' => $this->notes,
            'attachments' => $this->attachments,
            'external_id' => $this->external_id,
            'source_system' => $this->source_system,

            // Computed properties
            'is_completed' => $this->is_completed,
            'is_pending' => $this->is_pending,
            'is_urgent' => $this->is_urgent,
            'is_overdue' => $this->is_overdue,
            'status_color' => $this->status_color,
            'priority_color' => $this->priority_color,
            'time_until_scheduled' => $this->time_until_scheduled,
            'time_until_due' => $this->time_until_due,

            // Relationships
            'user' => UserResource::make($this->whenLoaded('user')),
            'lead' => LeadResource::make($this->whenLoaded('lead')),

            // Timestamps
            'scheduled_at' => $this->scheduled_at?->toISOString(),
            'completed_at' => $this->completed_at?->toISOString(),
            'due_at' => $this->due_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
