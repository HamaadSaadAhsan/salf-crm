<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('super-admin');
    }

    public function rules(): array
    {
        return [
            'status' => 'sometimes|string|in:open,in_progress,resolved,closed',
            'priority' => 'sometimes|string|in:low,medium,high,critical',
            'assigned_to_id' => 'sometimes|nullable|integer|exists:users,id',
        ];
    }

    public function messages(): array
    {
        return [
            'status.in' => 'Status must be one of: open, in_progress, resolved, closed.',
            'priority.in' => 'Priority must be one of: low, medium, high, critical.',
            'assigned_to_id.exists' => 'The selected user does not exist.',
        ];
    }
}
