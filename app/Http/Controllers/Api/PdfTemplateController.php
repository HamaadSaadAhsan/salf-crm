<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PdfTemplate;
use App\Models\PdfTemplateField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

class PdfTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        $templates = PdfTemplate::with(['service', 'creator'])
            ->withCount('fields')
            ->latest()
            ->get()
            ->map(fn (PdfTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
                'description' => $template->description,
                'is_active' => $template->is_active,
                'service' => $template->service ? [
                    'id' => $template->service->id,
                    'name' => $template->service->name,
                ] : null,
                'creator' => $template->creator ? [
                    'id' => $template->creator->id,
                    'name' => $template->creator->name,
                ] : null,
                'fields_count' => $template->fields_count,
                'file_url' => $template->file_url,
                'created_at' => $template->created_at->toISOString(),
            ]);

        return response()->json(['data' => $templates]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'is_active' => ['boolean'],
            'file' => ['required', 'file', 'mimes:pdf', 'max:20480'],
        ]);

        $filePath = $request->file('file')->store('pdf-templates', 'public');

        $template = PdfTemplate::create([
            'name' => $request->input('name'),
            'description' => $request->input('description'),
            'service_id' => $request->input('service_id'),
            'is_active' => $request->boolean('is_active', true),
            'file_path' => $filePath,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'data' => [
                'id' => $template->id,
                'name' => $template->name,
                'file_url' => $template->file_url,
            ],
        ], 201);
    }

    public function show(PdfTemplate $pdfTemplate): JsonResponse
    {
        $pdfTemplate->load(['service', 'fields', 'creator']);

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
                'creator' => $pdfTemplate->creator ? [
                    'id' => $pdfTemplate->creator->id,
                    'name' => $pdfTemplate->creator->name,
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

    public function update(Request $request, PdfTemplate $pdfTemplate): JsonResponse
    {
        $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'is_active' => ['boolean'],
        ]);

        $pdfTemplate->update($request->only(['name', 'description', 'service_id', 'is_active']));

        return response()->json(['message' => 'Template updated successfully.']);
    }

    public function destroy(PdfTemplate $pdfTemplate): JsonResponse
    {
        if ($pdfTemplate->file_path) {
            Storage::disk('public')->delete($pdfTemplate->file_path);
        }

        $pdfTemplate->delete();

        return response()->json(['message' => 'Template deleted successfully.']);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'exists:pdf_templates,id'],
        ]);

        $templates = PdfTemplate::whereIn('id', $request->input('ids'))->get();

        foreach ($templates as $template) {
            if ($template->file_path) {
                Storage::disk('public')->delete($template->file_path);
            }
            $template->delete();
        }

        return response()->json([
            'message' => "{$templates->count()} template(s) deleted successfully.",
            'deleted_count' => $templates->count(),
        ]);
    }

    /**
     * Scan PDF fields using the Python scanner script.
     *
     * @return JsonResponse{fields: array, repeat_groups: array, sections: array, total_fields: int, pages: int}
     */
    public function scanFields(PdfTemplate $pdfTemplate): JsonResponse
    {
        if (! $pdfTemplate->file_path || ! Storage::disk('public')->exists($pdfTemplate->file_path)) {
            return response()->json(['error' => 'PDF file not found.'], 404);
        }

        $absolutePath = Storage::disk('public')->path($pdfTemplate->file_path);
        $scriptPath = base_path('scripts/scan_pdf_fields.py');

        $python = config('services.python.path', 'python3');

        $result = Process::timeout(30)->run([$python, $scriptPath, $absolutePath]);

        if ($result->failed()) {
            return response()->json([
                'error' => 'PDF scan failed.',
                'details' => $result->errorOutput(),
            ], 422);
        }

        $data = json_decode($result->output(), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json(['error' => 'Invalid scanner output.'], 500);
        }

        return response()->json(['data' => $data]);
    }

    /**
     * Save/update field configuration for a template.
     */
    public function saveFields(Request $request, PdfTemplate $pdfTemplate): JsonResponse
    {
        $request->validate([
            'fields' => ['required', 'array'],
            'fields.*.field_name' => ['required', 'string', 'max:255'],
            'fields.*.field_label' => ['required', 'string', 'max:255'],
            'fields.*.field_type' => ['required', 'string', 'in:text,checkbox,date,dropdown,radio'],
            'fields.*.field_options' => ['nullable', 'array'],
            'fields.*.lead_field_mapping' => ['nullable', 'string', 'max:255'],
            'fields.*.default_value' => ['nullable', 'string', 'max:255'],
            'fields.*.sort_order' => ['integer'],
            'fields.*.page_number' => ['nullable', 'integer'],
            'fields.*.section' => ['nullable', 'string', 'max:255'],
            'fields.*.repeat_group' => ['nullable', 'string', 'max:255'],
            'fields.*.is_required' => ['boolean'],
        ]);

        // Remove existing fields and recreate
        $pdfTemplate->fields()->delete();

        foreach ($request->input('fields') as $index => $fieldData) {
            $pdfTemplate->fields()->create([
                'field_name' => $fieldData['field_name'],
                'field_label' => $fieldData['field_label'],
                'field_type' => $fieldData['field_type'] ?? 'text',
                'field_options' => $fieldData['field_options'] ?? null,
                'lead_field_mapping' => $fieldData['lead_field_mapping'] ?? null,
                'default_value' => $fieldData['default_value'] ?? null,
                'sort_order' => $fieldData['sort_order'] ?? $index,
                'page_number' => $fieldData['page_number'] ?? null,
                'section' => $fieldData['section'] ?? null,
                'repeat_group' => $fieldData['repeat_group'] ?? null,
                'is_required' => $fieldData['is_required'] ?? false,
            ]);
        }

        return response()->json([
            'message' => 'Fields saved successfully.',
            'data' => $pdfTemplate->fields()->get(),
        ]);
    }
}
