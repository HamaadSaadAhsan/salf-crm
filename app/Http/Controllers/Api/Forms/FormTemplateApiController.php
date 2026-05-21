<?php

namespace App\Http\Controllers\Api\Forms;

use App\Exceptions\Forms\FormsServiceException;
use App\Http\Controllers\Controller;
use App\Models\Forms\FieldMapping;
use App\Models\Forms\FormTemplate;
use App\Models\Forms\TemplateField;
use App\Services\Forms\FormsServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FormTemplateApiController extends Controller
{
    public function syncInventory(FormTemplate $formTemplate): JsonResponse
    {
        if ($formTemplate->file_type->value !== 'pdf') {
            return response()->json(['error' => 'Inventory sync is only available for PDF templates.'], 422);
        }

        try {
            $client = app(FormsServiceClient::class);
            $inspectResponse = $client->inspectPdf($formTemplate->file_path);
        } catch (FormsServiceException $e) {
            return response()->json(['error' => 'Forms service error: '.$e->getMessage()], 502);
        }

        DB::transaction(function () use ($formTemplate, $inspectResponse) {
            foreach ($inspectResponse->fields as $field) {
                TemplateField::updateOrCreate(
                    [
                        'form_template_id' => $formTemplate->id,
                        'field_name' => $field->name,
                    ],
                    [
                        'field_type' => $field->type,
                        'page' => $field->page,
                        'rect_pdf' => $field->rectPdf,
                        'page_size_pdf' => $field->pageSizePdf,
                        'export_values' => $field->exportValues,
                    ]
                );
            }

            $formTemplate->update([
                'page_count' => $inspectResponse->pageCount,
                'field_count' => count($inspectResponse->fields),
            ]);
        });

        return response()->json([
            'message' => 'Inventory synced.',
            'data' => [
                'page_count' => $inspectResponse->pageCount,
                'field_count' => count($inspectResponse->fields),
            ],
        ]);
    }

    public function getMappings(FormTemplate $formTemplate): JsonResponse
    {
        $fields = $formTemplate->templateFields()
            ->orderBy('page')
            ->orderBy('field_name')
            ->get();

        $mappingsIndexed = $formTemplate->fieldMappings()->get()->keyBy('field_name');

        $data = $fields->map(fn (TemplateField $f) => [
            'field_name' => $f->field_name,
            'field_type' => $f->field_type->value,
            'page' => $f->page,
            'export_values' => $f->export_values,
            'canonical_path' => $mappingsIndexed[$f->field_name]?->canonical_path ?? '',
            'value_for_truthy' => $mappingsIndexed[$f->field_name]?->value_for_truthy ?? '',
            'transform' => $mappingsIndexed[$f->field_name]?->transform ?? '',
            'notes' => $mappingsIndexed[$f->field_name]?->notes ?? '',
        ]);

        return response()->json(['data' => $data]);
    }

    public function saveMappings(Request $request, FormTemplate $formTemplate): JsonResponse
    {
        $request->validate([
            'mappings' => ['required', 'array'],
            'mappings.*.field_name' => ['required', 'string', 'max:255'],
            'mappings.*.canonical_path' => ['nullable', 'string', 'max:255'],
            'mappings.*.value_for_truthy' => ['nullable', 'string', 'max:255'],
            'mappings.*.transform' => ['nullable', 'string', 'max:100'],
            'mappings.*.notes' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($request, $formTemplate) {
            foreach ($request->input('mappings') as $m) {
                $canonicalPath = trim($m['canonical_path'] ?? '');

                if ($canonicalPath === '') {
                    FieldMapping::where('form_template_id', $formTemplate->id)
                        ->where('field_name', $m['field_name'])
                        ->delete();

                    continue;
                }

                FieldMapping::updateOrCreate(
                    [
                        'form_template_id' => $formTemplate->id,
                        'field_name' => $m['field_name'],
                    ],
                    [
                        'canonical_path' => $canonicalPath,
                        'value_for_truthy' => $m['value_for_truthy'] ?: null,
                        'transform' => $m['transform'] ?: null,
                        'notes' => $m['notes'] ?: null,
                    ]
                );
            }
        });

        $count = $formTemplate->fieldMappings()->count();
        $formTemplate->update(['field_count' => $formTemplate->templateFields()->count()]);

        return response()->json([
            'message' => 'Mappings saved.',
            'mapped_count' => $count,
        ]);
    }
}
