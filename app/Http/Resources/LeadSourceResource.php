<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadSourceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'status' => $this->status,
            'source_score' => $this->source_score ?? 0,
            'is_active' => $this->isActive(),
            'is_inactive' => $this->isInactive(),
            // Read the raw attributes so we never trip the count-query accessors
            // (getLeadsCountAttribute / getActiveLeadsCountAttribute). The counts
            // are emitted only when the caller eager-counted them via withCount,
            // keeping this resource O(1) when rendered per row in a list.
            'leads_count' => $this->when(
                array_key_exists('leads_count', $this->resource->getAttributes()),
                fn () => (int) $this->resource->getAttributes()['leads_count']
            ),
            'active_leads_count' => $this->when(
                array_key_exists('active_leads_count', $this->resource->getAttributes()),
                fn () => (int) $this->resource->getAttributes()['active_leads_count']
            ),

            // Timestamps
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
