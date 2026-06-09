<?php

namespace App\Http\Requests;

use App\Models\Lead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create leads');
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:leads,email'],
            'phone' => ['required', 'string', 'max:50'],
            'secondary_phone' => ['nullable', 'string', 'max:50'],
            'occupation' => ['nullable', 'string', 'max:255'],
            'inquiry_status' => ['nullable', 'string', Rule::in(array_keys(Lead::getStatusOptions()))],
            'priority' => ['nullable', 'string', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'lead_source_id' => ['nullable', 'integer', 'exists:lead_sources,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'country' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'budget' => ['nullable', 'array'],
            'budget.amount' => ['nullable', 'numeric', 'min:0'],
            'budget.currency' => ['nullable', 'string', 'max:10'],
            'detail' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'The lead name is required.',
            'name.max' => 'The lead name must not exceed 255 characters.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'A lead with this email address already exists.',
            'phone.required' => 'The phone number is required.',
            'phone.max' => 'The phone number must not exceed 50 characters.',
            'secondary_phone.max' => 'The secondary phone number must not exceed 50 characters.',
            'lead_source_id.exists' => 'The selected lead source is invalid.',
            'service_id.exists' => 'The selected service is invalid.',
            'inquiry_status.in' => 'The selected status is invalid.',
            'priority.in' => 'The selected priority is invalid.',
            'budget.amount.numeric' => 'The budget amount must be a number.',
            'budget.amount.min' => 'The budget amount must be at least 0.',
            'detail.max' => 'The notes must not exceed 5000 characters.',
        ];
    }
}
