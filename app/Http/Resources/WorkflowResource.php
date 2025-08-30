<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkflowResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'status' => $this->status,
            'metadata' => $this->metadata,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'steps' => WorkflowStepResource::collection($this->whenLoaded('steps')),
            'executions_count' => $this->executions_count ?? 0,
            'last_execution' => $this?->when(
                $this?->relationLoaded('executions') && $this?->executions?->isNotEmpty(),
                $this?->executions?->first()?->created_at
            )
        ];
    }
}
