<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInboundCallRequest extends FormRequest
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
     */
    public function rules(): array
    {
        return [
            'event' => ['required', 'string', 'in:ring,connect,disconnect,hangup'],
            'caller' => ['required', 'string'],
            'uniqueid' => ['required', 'string'],
            'linkedid' => ['nullable', 'string'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'event.required' => 'The call event is required.',
            'event.in' => 'The call event must be one of: ring, connect, disconnect, hangup.',
            'caller.required' => 'The caller number is required.',
            'exten.required' => 'The extension number is required.',
            'uniqueid.required' => 'The unique call ID is required.',
        ];
    }
}
