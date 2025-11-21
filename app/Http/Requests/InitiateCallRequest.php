<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InitiateCallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            //            'call_type' => 'nullable|string|in:voice',
            //            'sip_data' => 'nullable|array',
            'lead_id' => 'required|exists:leads,id',
        ];
    }

    public function messages(): array
    {
        return [
            'lead_id.required' => 'Please select a lead to call.',
            'lead_id.exists' => 'The selected lead does not exist.',
        ];
    }

    protected function prepareForValidation(): void
    {
        // Add the authenticated user as the caller
        $this->merge([
            'caller_id' => auth()->id(),
        ]);
    }
}
