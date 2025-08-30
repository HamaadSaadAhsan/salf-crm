<?php

// app/Http/Requests/UpdateWorkflowRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkflowRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('workflow'));
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status' => 'sometimes|in:draft,active,paused,inactive',
            'metadata' => 'nullable|array',

            // Steps validation (optional for updates)
            'steps' => 'sometimes|array|min:1',
            'steps.*.temp_id' => 'required_with:steps|string',
            'steps.*.step_type' => 'required_with:steps|in:trigger,action',
            'steps.*.service' => 'required_with:steps|string',
            'steps.*.operation' => 'required_with:steps|string',
            'steps.*.order' => 'required_with:steps|integer|min:0',
            'steps.*.configuration' => 'required_with:steps|array',
            'steps.*.enabled' => 'boolean',

            // Field mappings validation
            'steps.*.field_mappings' => 'nullable|array',
            'steps.*.field_mappings.*.source_field' => 'required|string',
            'steps.*.field_mappings.*.target_field' => 'required|string',
            'steps.*.field_mappings.*.field_type' => 'in:text,number,email,phone,url,date',
            'steps.*.field_mappings.*.transformation_rules' => 'nullable|array',
            'steps.*.field_mappings.*.required' => 'boolean',

            // Connections validation
            'connections' => 'nullable|array',
            'connections.*.from_step_temp_id' => 'required|string',
            'connections.*.to_step_temp_id' => 'required|string',
            'connections.*.conditions' => 'nullable|array'
        ];
    }
}
