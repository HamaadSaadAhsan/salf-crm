<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => 'required|string|in:bug_report,feature_request',
            'priority' => 'nullable|string|in:low,medium,high,critical',
            'subject' => 'required|string|max:255',
            'description' => 'required|string|max:10000',
            'attachments' => 'nullable|array|max:5',
            'attachments.*' => 'file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf',
        ];
    }

    public function messages(): array
    {
        return [
            'type.required' => 'Please select a ticket type.',
            'type.in' => 'Ticket type must be Bug Report or Feature Request.',
            'priority.required' => 'Please select a priority level.',
            'priority.in' => 'Priority must be one of: low, medium, high, critical.',
            'subject.required' => 'A subject is required.',
            'subject.max' => 'Subject cannot exceed 255 characters.',
            'description.required' => 'A description is required.',
            'description.max' => 'Description cannot exceed 10,000 characters.',
            'attachments.max' => 'You can upload a maximum of 5 files.',
            'attachments.*.max' => 'Each file must be less than 10MB.',
            'attachments.*.mimes' => 'Files must be jpg, jpeg, png, gif, webp, or pdf.',
        ];
    }
}
