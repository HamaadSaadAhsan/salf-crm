<?php

namespace App\Http\Resources;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->when(
                $request->user()?->can('view phone numbers'),
                $this->phone
            ),
            'occupation' => $this->occupation,
            'address' => $this->when($this->address, $this->address),
            'city' => $this->city,
            'country' => $this->country,
            'coordinates' => $this->when(
                $this->latitude && $this->longitude,
                [
                    'lat' => $this->latitude,
                    'lng' => $this->longitude,
                ]
            ),
            'inquiry_status' => $this->inquiry_status,
            'advisor_stage' => $this->advisor_stage,
            'priority' => $this->priority,
            'inquiry_type' => $this->inquiry_type,
            'lead_score' => $this->lead_score,
            'budget' => $this->budget,
            'formatted_budget' => $this->formatted_budget,
            'custom_fields' => $this->custom_fields,
            'detail' => $this->detail,
            'tags' => $this->tags,
            'has_attachment' => $this->has_attachment ?? false,

            // Relationships
            'service' => $this->when(
                $this->relationLoaded('service') && $this->service,
                fn () => ServiceResource::make($this->service)
            ),
            'source' => $this->when(
                $this->relationLoaded('source') && $this->source,
                fn () => LeadSourceResource::make($this->source)
            ),
            'assigned_to' => $this->when(
                $this->relationLoaded('assignedTo') && $this->assignedTo,
                fn () => UserResource::make($this->assignedTo)
            ),
            'created_by' => $this->when(
                $this->relationLoaded('createdBy') && $this->createdBy,
                fn () => UserResource::make($this->createdBy)
            ),
            'qualified_by' => $this->when(
                $this->relationLoaded('qualifiedBy') && $this->qualifiedBy,
                fn () => UserResource::make($this->qualifiedBy)
            ),
            'qualified_at' => $this->qualified_at?->toISOString(),
            'requalified_from_advisor_id' => $this->requalified_from_advisor_id,
            'requalify_reason' => $this->requalify_reason,

            // Computed fields
            'days_since_created' => $this->days_since_created,
            'is_hot_lead' => $this->is_hot_lead,
            'next_follow_up_at' => $this->next_follow_up_at?->toISOString(),
            'last_activity_at' => Carbon::parse($this->last_activity_at)->diffForHumans(),

            // Timestamps
            'created_at' => $this->created_at->isToday() ? $this->created_at->format('H:i') : $this->created_at->diffForHumans(),
            'updated_at' => $this->updated_at->isToday() ? $this->updated_at->format('H:i') : $this->updated_at->diffForHumans(),

            'raw_created_at' => $this->created_at->toDateTimeString(),
            'raw_updated_at' => $this->updated_at->toDateTimeString(),

            // Additional data for detail view
            'activities' => $this->whenLoaded('activities', fn () => LeadActivityResource::collection($this->activities)),
            //            'notes' => LeadNoteResource::collection($this->whenLoaded('notes')),
            'tasks' => $this->whenLoaded('tasks', fn () => TaskResource::collection($this->tasks)),
            'next_task' => $this->whenLoaded('tasks', function () {
                $task = $this->tasks->first();
                if (! $task) {
                    return null;
                }

                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status->value,
                    'priority' => $task->priority->value,
                    'due_at' => $task->due_at?->toISOString(),
                    'assigned_to' => $task->assignedTo ? [
                        'id' => $task->assignedTo->id,
                        'name' => $task->assignedTo->name,
                        'email' => $task->assignedTo->email,
                    ] : null,
                    'created_at' => $task->created_at?->toISOString(),
                ];
            }),

            // URLs for frontend routing
            'urls' => [
                'show' => route('leads.show', $this->id),
                'edit' => route('leads.update', $this->id),
            ],
        ];
    }
}
