<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSipAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $sipAccountId = $this->route('sip_account')?->id;

        return [
            'username' => [
                'required',
                'string',
                'max:255',
                'alpha_num:ascii',
                Rule::unique('sip_accounts', 'username')->ignore($sipAccountId),
            ],
            'password' => $this->isMethod('POST') ? 'required|string|min:6' : 'nullable|string|min:6',
            'domain' => 'required|string|max:255',
            'display_name' => 'nullable|string|max:255',
            'port' => 'required|integer|between:1,65535',
            'transport' => 'required|string|in:UDP,TCP,TLS',
            'codec_priority' => 'nullable|string|max:255',
            'is_enabled' => 'boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'username.required' => 'The SIP username is required.',
            'username.unique' => 'This SIP username is already taken.',
            'username.alpha_num' => 'The SIP username may only contain letters and numbers.',
            'password.required' => 'The SIP password is required.',
            'password.min' => 'The SIP password must be at least 6 characters.',
            'domain.required' => 'The SIP domain is required.',
            'port.required' => 'The SIP port is required.',
            'port.between' => 'The SIP port must be between 1 and 65535.',
            'transport.in' => 'The transport protocol must be UDP, TCP, or TLS.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_enabled') && is_string($this->is_enabled)) {
            $this->merge([
                'is_enabled' => filter_var($this->is_enabled, FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }
}
