<?php

namespace App\Http\Controllers\Settings\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\FieldMapping;
use App\Models\Forms\FormTemplate;
use App\Models\Forms\Program;
use Inertia\Inertia;
use Inertia\Response;

class TemplatesMappingsController extends Controller
{
    public function show(Program $program, FormTemplate $formTemplate): Response
    {
        abort_if($formTemplate->program_id !== $program->id, 404);

        $formTemplate->load(['templateFields' => fn ($q) => $q->orderBy('page')->orderBy('field_name')]);

        $mappingsIndexed = $formTemplate->fieldMappings()
            ->get()
            ->keyBy('field_name');

        $fields = $formTemplate->templateFields->map(fn ($f) => [
            'id' => $f->id,
            'field_name' => $f->field_name,
            'field_type' => $f->field_type->value,
            'page' => $f->page,
            'export_values' => $f->export_values,
            'mapping' => isset($mappingsIndexed[$f->field_name]) ? [
                'id' => $mappingsIndexed[$f->field_name]->id,
                'canonical_path' => $mappingsIndexed[$f->field_name]->canonical_path,
                'value_for_truthy' => $mappingsIndexed[$f->field_name]->value_for_truthy,
                'transform' => $mappingsIndexed[$f->field_name]->transform,
                'notes' => $mappingsIndexed[$f->field_name]->notes,
            ] : null,
        ]);

        $existingPaths = FieldMapping::query()
            ->distinct()
            ->orderBy('canonical_path')
            ->pluck('canonical_path');

        return Inertia::render('settings/management/forms/templates/mappings', [
            'program' => [
                'id' => $program->id,
                'name' => $program->name,
                'code' => $program->code,
            ],
            'template' => [
                'id' => $formTemplate->id,
                'code' => $formTemplate->code,
                'name' => $formTemplate->name,
                'file_type' => $formTemplate->file_type->value,
                'mapping_mode' => $formTemplate->mapping_mode->value,
                'field_count' => $formTemplate->field_count,
                'page_count' => $formTemplate->page_count,
            ],
            'fields' => $fields,
            'existingPaths' => $existingPaths,
        ]);
    }
}
