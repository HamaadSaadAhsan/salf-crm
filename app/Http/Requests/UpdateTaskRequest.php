<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'taskable_type' => 'nullable|string',
            'taskable_id' => 'nullable', // Can be integer or UUID string depending on the model
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'due_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
            'status' => 'nullable|in:pending,in_progress,completed,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'type' => 'nullable|in:call,message,meeting,email,other',
            'assigned_to_id' => 'nullable|integer|exists:users,id',
            'collaborators' => 'nullable|array',
            'collaborators.*' => 'integer|exists:users,id',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Task title is required',
            'title.max' => 'Task title cannot exceed 255 characters',
            'due_at.date' => 'Due date must be a valid date',
            'completed_at.date' => 'Completed date must be a valid date',
            'status.in' => 'Status must be one of: pending, in_progress, completed, cancelled',
            'priority.in' => 'Priority must be one of: low, medium, high, urgent',
            'type.in' => 'Type must be one of: call, message, meeting, email, other',
            'assigned_to_id.exists' => 'The selected user does not exist',
            'collaborators.*.exists' => 'One or more selected collaborators do not exist',
        ];
    }
}
