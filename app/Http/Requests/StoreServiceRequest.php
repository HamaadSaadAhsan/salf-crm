<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreServiceRequest extends FormRequest
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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'detail' => ['nullable', 'string'],
            'country_code' => ['nullable', 'string', 'size:2'],
            'country_name' => ['nullable', 'string', 'max:255'],
            'parent_id' => ['nullable', 'exists:services,id'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'status' => ['required', 'in:draft,active,inactive,archived'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'The service name is required.',
            'name.max' => 'The service name must not exceed 255 characters.',
            'country_code.size' => 'The country code must be exactly 2 characters.',
            'country_name.max' => 'The country name must not exceed 255 characters.',
            'parent_id.exists' => 'The selected parent service is invalid.',
            'sort_order.min' => 'The sort order must be at least 0.',
            'status.required' => 'The service status is required.',
            'status.in' => 'The service status must be one of: draft, active, inactive, archived.',
        ];
    }
}
