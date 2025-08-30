<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FacebookIntegrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->user()->superAdmin();
    }

    public function rules(): array
    {
        return [
            'appId' => 'required|string|min:15|max:20',
            'appSecret' => 'required|string|min:32|max:100',
            'pageId' => 'nullable|string|min:10|max:25',
            'webhook_verify_token' => 'sometimes|string|min:8|max:100',
            'enableMessaging' => 'sometimes|boolean',
            'enablePosts' => 'sometimes|boolean',
            'enableInsights' => 'sometimes|boolean',
            'enableComments' => 'sometimes|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'appId.required' => 'Facebook App ID is required',
            'appId.min' => 'Facebook App ID must be at least 15 characters',
            'appSecret.required' => 'Facebook App Secret is required',
            'appSecret.min' => 'Facebook App Secret must be at least 32 characters',
            'pageId.required' => 'Facebook Page ID is required',
        ];
    }
}
