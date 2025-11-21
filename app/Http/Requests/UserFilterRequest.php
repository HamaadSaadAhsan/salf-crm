<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UserFilterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            // Pagination
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:100',

            // Sorting
            'sort_by' => 'string|in:id,name,email,created_at,updated_at,email_verified_at,active_services_count,leads_count,active_leads_count',
            'sort_order' => 'string|in:asc,desc',

            // Search
            'search' => 'string|max:255',

            // Role filters
            'role' => 'array',
            'role.*' => 'string|exists:roles,name',

            // Service (Program) filters
            'service_id' => 'array',
            'service_id.*' => 'integer|exists:services,id',
            'service_country' => 'string|max:2',
            'service_status' => 'string|in:active,inactive',
            'include_child_services' => 'boolean',

            // User status filters
            'email_verified' => 'string|in:verified,unverified',
            'active_only' => 'boolean',

            // Lead related filters
            'has_leads' => 'string|in:yes,no',
            'has_active_leads' => 'boolean',
            'min_leads' => 'integer|min:0',
            'max_leads' => 'integer|min:0',

            // Service related filters
            'no_services' => 'boolean',
            'min_services' => 'integer|min:0',

            // Date filters
            'date_from' => 'date',
            'date_to' => 'date|after_or_equal:date_from',
            'verified_from' => 'date',
            'verified_to' => 'date|after_or_equal:verified_from',
            'recent_days' => 'integer|min:1|max:365',

            // Other filters
            'email_domain' => 'string|max:255',
            'exclude_ids' => 'array',
            'exclude_ids.*' => 'integer',
            'real_time' => 'boolean',
        ];
    }
}
