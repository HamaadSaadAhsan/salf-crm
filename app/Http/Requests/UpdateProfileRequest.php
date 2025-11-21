<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
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
        $userId = auth()->id();

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['nullable', 'string', 'max:20'],
            'company' => ['nullable', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'avatar' => ['nullable', 'image', 'mimes:jpeg,jpg,png', 'max:2048'],
            'availability' => ['nullable', 'boolean'],
            'visibility' => ['nullable', 'string', 'in:public,private,friends'],
            'availability_date' => ['nullable', 'date'],
            'availability_time' => ['nullable', 'date_format:H:i'],
            'dismissal_time' => ['nullable', 'date_format:H:i'],
        ];
    }

    /**
     * Get custom error messages for validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.max' => 'The name must not exceed 255 characters.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email address is already in use.',
            'phone.max' => 'The phone number must not exceed 20 characters.',
            'company.max' => 'The company name must not exceed 255 characters.',
            'birth_date.before' => 'The birth date must be a date before today.',
            'avatar.image' => 'The avatar must be an image file.',
            'avatar.mimes' => 'The avatar must be a JPEG or PNG file.',
            'avatar.max' => 'The avatar must not exceed 2MB in size.',
            'visibility.in' => 'The visibility must be either public, private, or friends.',
        ];
    }
}
