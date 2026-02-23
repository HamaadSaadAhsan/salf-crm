<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReportFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_from' => 'date',
            'date_to' => 'date|after_or_equal:date_from',
            'office_id' => 'integer|exists:offices,id',
            'zone_id' => 'integer|exists:zones,id',
            'service_id' => 'array',
            'service_id.*' => 'integer|exists:services,id',
            'source_id' => 'array',
            'source_id.*' => 'integer|exists:lead_sources,id',
            'user_id' => 'integer|exists:users,id',
            'group_by' => 'string|in:day,week,month',
        ];
    }

    public function messages(): array
    {
        return [
            'date_to.after_or_equal' => 'End date must be after or equal to start date.',
        ];
    }
}
