<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCountryRequest extends FormRequest
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
     */
    public function rules(): array
    {
        $countryId = $this->route('country')->id ?? null;

        return [
            'name' => ['required', 'string', 'max:255', 'unique:countries,name,'.$countryId],
            'code' => ['required', 'string', 'max:3', 'unique:countries,code,'.$countryId],
            'iso2' => ['required', 'string', 'size:2', 'unique:countries,iso2,'.$countryId],
            'phone_code' => ['nullable', 'string', 'max:20'],
            'currency' => ['nullable', 'string', 'max:3'],
            'currency_symbol' => ['nullable', 'string', 'max:10'],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'The country name is required.',
            'name.unique' => 'This country name already exists.',
            'code.required' => 'The country code is required.',
            'code.unique' => 'This country code already exists.',
            'code.max' => 'The country code must not exceed 3 characters.',
            'iso2.required' => 'The ISO2 code is required.',
            'iso2.size' => 'The ISO2 code must be exactly 2 characters.',
            'iso2.unique' => 'This ISO2 code already exists.',
        ];
    }
}
