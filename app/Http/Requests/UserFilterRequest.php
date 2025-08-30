<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UserFilterRequest extends FormRequest
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
     * @return array<string, ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:100',
            'sort_by' => 'string|in:id,name,email,created_at,updated_at',
            'sort_order' => 'string|in:asc,desc',
            'search' => 'string|max:255',
            'role' => 'string|exists:roles,name',
            'active' => 'boolean',
            'email_verified' => 'boolean',
            'available' => 'boolean',
            'service' => 'string|exists:services,name',
        ];
    }
}
