<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAdvisorStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        $lead = $this->route('lead');
        $user = $this->user();

        // Admin roles can always update
        if ($user->hasAnyRole(['super-admin', 'admin', 'manager', 'team-lead'])) {
            return true;
        }

        // The assigned advisor can update
        return $lead->assigned_to === $user->id
            && $user->hasAnyRole(['sales-rep', 'senior-sales-rep']);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'stage' => 'required|string|in:contacted,meeting,contract_signed,initial_payment,won,lost',
            'reason' => 'required_if:stage,lost|nullable|string|max:1000',
            'initial_payment_amount' => 'required_if:stage,initial_payment|nullable|numeric|min:0',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'stage.required' => 'The advisor stage is required.',
            'stage.in' => 'Invalid advisor stage.',
            'reason.required_if' => 'A reason is required when marking a lead as lost.',
            'initial_payment_amount.required_if' => 'The initial payment amount is required.',
            'initial_payment_amount.numeric' => 'The initial payment amount must be a number.',
            'initial_payment_amount.min' => 'The initial payment amount must be at least 0.',
        ];
    }
}
