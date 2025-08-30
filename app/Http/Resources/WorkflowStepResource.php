<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkflowStepResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'step_type' => $this->step_type,
            'service' => $this->service,
            'operation' => $this->operation,
            'order' => $this->order,
            'configuration' => $this->configuration,
            'enabled' => $this->enabled,
            'field_mappings' => WorkflowFieldMappingResource::collection($this->whenLoaded('fieldMappings')),
            'connections' => $this->when(
                $this->relationLoaded('outgoingConnections'),
                $this->outgoingConnections->map(function ($connection) {
                    return [
                        'id' => $connection->id,
                        'to_step_id' => $connection->to_step_id,
                        'conditions' => $connection->conditions
                    ];
                })
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at
        ];
    }
}
