<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
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
            'name' => $this->name,
            'detail' => $this->detail,
            'country_code' => $this->country_code,
            'country_name' => $this->country_name,
            'parent_id' => $this->parent_id,
            'sort_order' => $this->sort_order,
            'status' => $this->status,
            'is_parent' => $this->children_count > 0,
            'full_hierarchy' => $this->full_hierarchy,

            // Relationships
            'parent' => ServiceResource::make($this->whenLoaded('parent')),
            'children' => ServiceResource::collection($this->whenLoaded('children')),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
