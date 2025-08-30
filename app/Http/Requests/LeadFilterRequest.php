<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LeadFilterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:100',
            'sort_by' => 'string|in:created_at,updated_at,name,email,lead_score,inquiry_status,priority,last_activity_at',
            'sort_order' => 'string|in:asc,desc',
            'search' => 'string|max:255',
            'status' => 'array',
            'status.*' => 'string|in:new,contacted,qualified,proposal,won,lost,nurturing',
            'priority' => 'string|in:low,medium,high,urgent',
            'assigned_to' => 'uuid|exists:users,id',
            'source_id' => 'integer|exists:lead_sources,id',
            'service_id' => 'integer|exists:services,id',
            'date_from' => 'date',
            'date_to' => 'date|after_or_equal:date_from',
            'min_score' => 'integer|min:0|max:100',
            'max_score' => 'integer|min:0|max:100|gte:min_score',
            'country' => 'string|size:3', // ISO country code
            'city' => 'string|max:100',
            'lat' => 'numeric|between:-90,90',
            'lng' => 'numeric|between:-180,180',
            'radius' => 'integer|min:1|max:1000', // km
            'hot_leads' => 'boolean',
            'active_only' => 'boolean',
            'real_time' => 'boolean',
            'format' => 'string|in:csv,xlsx,json', // For exports
        ];
    }

    public function messages(): array
    {
        return [
            'per_page.max' => 'Maximum 100 items per page allowed.',
            'max_score.gte' => 'Maximum score must be greater than or equal to minimum score.',
            'date_to.after_or_equal' => 'End date must be after or equal to start date.',
        ];
    }
}
