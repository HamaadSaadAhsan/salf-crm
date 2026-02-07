<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SavedFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->user()->id;
        $filterId = $this->route('saved_filter');

        return [
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('saved_filters')->where('user_id', $userId)->ignore($filterId),
            ],
            'filters' => 'required|array',
            'is_default' => 'boolean',
            'color' => 'nullable|string|max:20',
        ];
    }

    public function messages(): array
    {
        return [
            'name.unique' => 'You already have a saved filter with this name.',
        ];
    }
}
