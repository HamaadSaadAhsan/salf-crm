<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StatusFilterRequest extends FormRequest
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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'page' => 'integer|min:1',
            'per_page' => 'integer|min:1|max:100',
            'sort_by' => 'string|in:name,created_at,updated_at',
            'sort_order' => 'string|in:asc,desc',
            'search' => 'string|max:255',
        ];
    }
}
