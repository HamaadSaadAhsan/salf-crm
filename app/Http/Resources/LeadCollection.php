<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class LeadCollection extends ResourceCollection
{
    public function toArray(Request $request): array
    {
        return [
            'data' => $this->collection,
            'meta' => [
                'total_count' => $this->collection->count(),
                'high_priority_count' => $this->collection->where('priority', 'high')->count(),
                'hot_leads_count' => $this->collection->where('is_hot_lead', true)->count(),
                'avg_score' => round($this->collection->avg('lead_score'), 1),
            ]
        ];
    }
}
