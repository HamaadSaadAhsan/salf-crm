<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => 'required|string|max:10000',
            'attachments' => 'nullable|array|max:5',
            'attachments.*' => 'file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf',
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Comment body is required.',
            'body.max' => 'Comment cannot exceed 10,000 characters.',
            'attachments.max' => 'You can upload a maximum of 5 files.',
            'attachments.*.max' => 'Each file must be less than 10MB.',
            'attachments.*.mimes' => 'Files must be jpg, jpeg, png, gif, webp, or pdf.',
        ];
    }
}
