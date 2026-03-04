<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadPdfSubmission;
use App\Models\PdfTemplate;
use App\Models\PdfTemplateField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class LeadPdfSubmissionController extends Controller
{
    /**
     * List available templates for a lead's service.
     */
    public function templates(Lead $lead): JsonResponse
    {
        $this->authorize('viewAny', LeadPdfSubmission::class);

        $query = PdfTemplate::where('is_active', true)
            ->withCount('fields');

        if ($lead->service_id) {
            $query->where(function ($q) use ($lead) {
                $q->where('service_id', $lead->service_id)
                    ->orWhereNull('service_id');
            });
        }

        $templates = $query->latest()->get()->map(fn (PdfTemplate $template) => [
            'id' => $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'service' => $template->service ? [
                'id' => $template->service->id,
                'name' => $template->service->name,
            ] : null,
            'fields_count' => $template->fields_count,
            'file_url' => $template->file_url,
        ]);

        return response()->json(['data' => $templates]);
    }

    /**
     * Show a template with its fields (lead-scoped, for the fill form).
     */
    public function showTemplate(Lead $lead, PdfTemplate $pdfTemplate): JsonResponse
    {
        $this->authorize('viewAny', LeadPdfSubmission::class);

        $pdfTemplate->load('fields');

        return response()->json([
            'data' => [
                'id' => $pdfTemplate->id,
                'name' => $pdfTemplate->name,
                'description' => $pdfTemplate->description,
                'is_active' => $pdfTemplate->is_active,
                'service' => $pdfTemplate->service ? [
                    'id' => $pdfTemplate->service->id,
                    'name' => $pdfTemplate->service->name,
                ] : null,
                'fields' => $pdfTemplate->fields->map(fn (PdfTemplateField $field) => [
                    'id' => $field->id,
                    'field_name' => $field->field_name,
                    'field_label' => $field->field_label,
                    'field_type' => $field->field_type,
                    'field_options' => $field->field_options,
                    'lead_field_mapping' => $field->lead_field_mapping,
                    'default_value' => $field->default_value,
                    'sort_order' => $field->sort_order,
                    'page_number' => $field->page_number,
                    'section' => $field->section,
                    'repeat_group' => $field->repeat_group,
                    'is_required' => $field->is_required,
                ]),
                'file_url' => $pdfTemplate->file_url,
                'created_at' => $pdfTemplate->created_at->toISOString(),
            ],
        ]);
    }

    /**
     * List submissions for a lead.
     */
    public function index(Lead $lead): JsonResponse
    {
        $this->authorize('viewAny', LeadPdfSubmission::class);

        $submissions = $lead->pdfSubmissions()
            ->with(['template', 'submittedBy'])
            ->latest()
            ->get()
            ->map(fn (LeadPdfSubmission $sub) => [
                'id' => $sub->id,
                'template' => [
                    'id' => $sub->template->id,
                    'name' => $sub->template->name,
                ],
                'status' => $sub->status,
                'submitted_by' => $sub->submittedBy ? [
                    'id' => $sub->submittedBy->id,
                    'name' => $sub->submittedBy->name,
                ] : null,
                'created_at' => $sub->created_at->toISOString(),
                'updated_at' => $sub->updated_at->toISOString(),
            ]);

        return response()->json(['data' => $submissions]);
    }

    /**
     * Create a new submission.
     */
    public function store(Request $request, Lead $lead): JsonResponse
    {
        $this->authorize('create', LeadPdfSubmission::class);

        $request->validate([
            'pdf_template_id' => ['required', 'integer', 'exists:pdf_templates,id'],
            'field_values' => ['required', 'array'],
            'status' => ['sometimes', 'string', 'in:draft,completed'],
        ]);

        $status = $request->input('status', 'draft');

        if ($status === 'completed') {
            $this->validateRequiredFields(
                (int) $request->input('pdf_template_id'),
                $request->input('field_values'),
            );
        }

        $submission = $lead->pdfSubmissions()->create([
            'pdf_template_id' => $request->input('pdf_template_id'),
            'field_values' => $request->input('field_values'),
            'status' => $status,
            'submitted_by' => auth()->id(),
        ]);

        $submission->load('template');

        return response()->json([
            'data' => [
                'id' => $submission->id,
                'template' => [
                    'id' => $submission->template->id,
                    'name' => $submission->template->name,
                ],
                'field_values' => $submission->field_values,
                'status' => $submission->status,
                'created_at' => $submission->created_at->toISOString(),
            ],
        ], 201);
    }

    /**
     * Get a specific submission with field values.
     */
    public function show(Lead $lead, LeadPdfSubmission $submission): JsonResponse
    {
        abort_unless($submission->lead_id === $lead->id, 404);

        $this->authorize('view', $submission);

        $submission->load(['template.fields', 'submittedBy']);

        return response()->json([
            'data' => [
                'id' => $submission->id,
                'template' => [
                    'id' => $submission->template->id,
                    'name' => $submission->template->name,
                    'file_url' => $submission->template->file_url,
                    'fields' => $submission->template->fields,
                ],
                'field_values' => $submission->field_values,
                'status' => $submission->status,
                'submitted_by' => $submission->submittedBy ? [
                    'id' => $submission->submittedBy->id,
                    'name' => $submission->submittedBy->name,
                ] : null,
                'created_at' => $submission->created_at->toISOString(),
                'updated_at' => $submission->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Update submission field values.
     */
    public function update(Request $request, Lead $lead, LeadPdfSubmission $submission): JsonResponse
    {
        abort_unless($submission->lead_id === $lead->id, 404);

        $this->authorize('update', $submission);

        $request->validate([
            'field_values' => ['required', 'array'],
            'status' => ['sometimes', 'string', 'in:draft,completed'],
        ]);

        $status = $request->input('status', $submission->status);

        if ($status === 'completed') {
            $this->validateRequiredFields(
                $submission->pdf_template_id,
                $request->input('field_values'),
            );
        }

        $submission->update([
            'field_values' => $request->input('field_values'),
            'status' => $status,
        ]);

        return response()->json(['message' => 'Submission updated successfully.']);
    }

    /**
     * Delete a submission.
     */
    public function destroy(Lead $lead, LeadPdfSubmission $submission): JsonResponse
    {
        abort_unless($submission->lead_id === $lead->id, 404);

        $this->authorize('delete', $submission);

        $submission->delete();

        return response()->json(['message' => 'Submission deleted successfully.']);
    }

    /**
     * Validate that all required template fields have non-empty values.
     *
     * @param  array<string, string>  $fieldValues
     *
     * @throws ValidationException
     */
    private function validateRequiredFields(int $templateId, array $fieldValues): void
    {
        $requiredFields = PdfTemplate::find($templateId)
            ?->fields()
            ->where('is_required', true)
            ->pluck('field_name');

        if (! $requiredFields || $requiredFields->isEmpty()) {
            return;
        }

        $missingFields = $requiredFields->filter(
            fn (string $fieldName) => empty($fieldValues[$fieldName] ?? ''),
        )->values()->all();

        if (! empty($missingFields)) {
            throw ValidationException::withMessages([
                'field_values' => 'The following required fields are missing: '.implode(', ', $missingFields),
                'missing_fields' => $missingFields,
            ]);
        }
    }
}
