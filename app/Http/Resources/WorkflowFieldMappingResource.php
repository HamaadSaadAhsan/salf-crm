<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkflowFieldMappingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source_field' => $this->source_field,
            'target_field' => $this->target_field,
            'field_type' => $this->field_type,
            'transformation_rules' => $this->transformation_rules,
            'required' => $this->required
        ];
    }
}
