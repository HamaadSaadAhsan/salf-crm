<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrganizationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('super-admin');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('organizations', 'name')->ignore($this->organization)],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('organizations', 'slug')->ignore($this->organization)],
            'owner_id' => 'nullable|exists:users,id',
            'logo' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'settings' => 'nullable|array',
        ];
    }
}
