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
            'phone' => $this->phone,
            'occupation' => $this->occupation,
            'address' => $this->when($this->address, $this->address),
            'city' => $this->city,
            'country' => $this->country,
            'coordinates' => $this->when(
                $this->latitude && $this->longitude,
                [
                    'lat' => $this->latitude,
                    'lng' => $this->longitude
                ]
            ),
            'inquiry_status' => $this->inquiry_status,
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
            'service' => ServiceResource::make($this->whenLoaded('service')),
            'source' => LeadSourceResource::make($this->whenLoaded('source')),
            'assigned_to' => UserResource::make($this->whenLoaded('assignedTo')),
            'created_by' => UserResource::make($this->whenLoaded('createdBy')),

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
            'activities' => LeadActivityResource::collection($this->whenLoaded('activities')),
//            'notes' => LeadNoteResource::collection($this->whenLoaded('notes')),

            // URLs for frontend routing
            'urls' => [
                'show' => route('leads.show', $this->id),
                'edit' => route('leads.update', $this->id),
            ],
        ];
    }
}
