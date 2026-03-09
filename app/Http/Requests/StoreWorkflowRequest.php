<?php

// app/Http/Requests/StoreWorkflowRequest.php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreWorkflowRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'status' => 'in:draft,active,paused,inactive',
            'metadata' => 'nullable|array',

            // Steps validation (optional - new workflows can be empty)
            'steps' => 'nullable|array',
            'steps.*.id' => 'nullable|integer',
            'steps.*.temp_id' => 'nullable|string',
            'steps.*.step_type' => 'required_with:steps|in:trigger,action',
            'steps.*.service' => 'required_with:steps|string',
            'steps.*.operation' => 'required_with:steps|string',
            'steps.*.order' => 'required_with:steps|integer|min:0',
            'steps.*.configuration' => 'nullable|array',
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
            'connections.*.conditions' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'steps.required' => 'Workflow must have at least one step',
            'steps.*.step_type.in' => 'Step type must be either trigger or action',
            'steps.*.service.required' => 'Each step must specify a service',
            'steps.*.operation.required' => 'Each step must specify an operation',
        ];
    }
}
