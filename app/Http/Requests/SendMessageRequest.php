<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'to' => ['required', 'array', 'min:1'],
            'to.*' => ['required'],   // accepts user ID (int) or email string (external)
            'cc' => ['nullable', 'array'],
            'cc.*' => ['required'],
            'bcc' => ['nullable', 'array'],
            'bcc.*' => ['required'],
            'subject' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'parent_id' => ['nullable', 'integer', 'exists:messages,id'],
            'type' => ['nullable', 'in:new,reply,forward'],
            'is_draft' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'to.required' => 'At least one recipient is required.',
            'to.min' => 'At least one recipient is required.',
            'subject.required' => 'Subject is required.',
            'body.required' => 'Message body is required.',
        ];
    }
}
