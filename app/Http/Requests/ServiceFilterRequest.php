<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ServiceFilterRequest extends FormRequest
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
            'sort_by' => 'string|in:name,country_name,created_at,updated_at,sort_order',
            'sort_order' => 'string|in:asc,desc',
            'search' => 'string|max:255',
            'status' => 'string|in:active,inactive',
            'parent_id' => 'integer|exists:services,id|nullable',
            'country_code' => 'string|size:3',
            'with_users' => 'boolean',
            'only_parents' => 'boolean',
            'only_children' => 'boolean'
        ];
    }
}
