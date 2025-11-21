<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => [
                'value' => $this->status?->value,
                'label' => $this->status?->label(),
                'color' => $this->status?->color(),
            ],
            'priority' => [
                'value' => $this->priority?->value,
                'label' => $this->priority?->label(),
                'color' => $this->priority?->color(),
            ],
            'type' => [
                'value' => $this->type?->value,
                'label' => $this->type?->label(),
                'color' => $this->type?->color(),
                'icon' => $this->type?->icon(),
            ],
            'due_at' => $this->due_at?->toISOString(),
            'due_at_formatted' => $this->due_at?->format('M d, Y'),
            'completed_at' => $this->completed_at?->toISOString(),
            'completed_at_formatted' => $this->completed_at?->format('M d, Y'),
            'is_completed' => $this->completed_at !== null,
            'is_overdue' => $this->due_at && $this->due_at->isPast() && ! $this->completed_at,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),

            // Relationships
            'assigned_to' => UserResource::make($this->whenLoaded('assignedTo')),
            'created_by' => UserResource::make($this->whenLoaded('createdBy')),
            'collaborators' => UserResource::collection($this->whenLoaded('collaborators')),
            'taskable_type' => $this->taskable_type,
            'taskable_id' => $this->taskable_id,
        ];
    }
}
