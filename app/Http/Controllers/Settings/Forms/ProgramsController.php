<?php

namespace App\Http\Controllers\Settings\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\Program;
use Inertia\Inertia;
use Inertia\Response;

class ProgramsController extends Controller
{
    public function index(): Response
    {
        $programs = Program::query()
            ->withCount(['formTemplates', 'applications'])
            ->with(['formTemplates' => fn ($q) => $q
                ->select('id', 'program_id', 'name', 'code', 'file_type', 'mapping_mode', 'is_active', 'field_count', 'page_count', 'sort_order')
                ->withCount(['templateFields', 'fieldMappings'])
                ->orderBy('sort_order'),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Program $p) => [
                'id' => $p->id,
                'code' => $p->code,
                'name' => $p->name,
                'country_code' => $p->country_code,
                'is_active' => $p->is_active,
                'form_templates_count' => $p->form_templates_count,
                'applications_count' => $p->applications_count,
                'form_templates' => $p->formTemplates->map(fn ($t) => [
                    'id' => $t->id,
                    'code' => $t->code,
                    'name' => $t->name,
                    'file_type' => $t->file_type->value,
                    'mapping_mode' => $t->mapping_mode->value,
                    'is_active' => $t->is_active,
                    'field_count' => $t->field_count,
                    'page_count' => $t->page_count,
                    'sort_order' => $t->sort_order,
                    'template_fields_count' => $t->template_fields_count,
                    'field_mappings_count' => $t->field_mappings_count,
                ]),
            ]);

        return Inertia::render('settings/management/forms/programs/index', [
            'programs' => $programs,
        ]);
    }

    public function show(Program $program): Response
    {
        $program->loadCount(['formTemplates', 'applications']);
        $program->load(['formTemplates' => fn ($q) => $q
            ->select('id', 'program_id', 'name', 'code', 'file_type', 'mapping_mode', 'is_active', 'field_count', 'page_count', 'sort_order')
            ->withCount(['templateFields', 'fieldMappings'])
            ->orderBy('sort_order'),
        ]);

        $programData = [
            'id' => $program->id,
            'code' => $program->code,
            'name' => $program->name,
            'country_code' => $program->country_code,
            'is_active' => $program->is_active,
            'form_templates_count' => $program->form_templates_count,
            'applications_count' => $program->applications_count,
            'form_templates' => $program->formTemplates->map(fn ($t) => [
                'id' => $t->id,
                'code' => $t->code,
                'name' => $t->name,
                'file_type' => $t->file_type->value,
                'mapping_mode' => $t->mapping_mode->value,
                'is_active' => $t->is_active,
                'field_count' => $t->field_count,
                'page_count' => $t->page_count,
                'sort_order' => $t->sort_order,
                'template_fields_count' => $t->template_fields_count,
                'field_mappings_count' => $t->field_mappings_count,
            ]),
        ];

        return Inertia::render('settings/management/forms/programs/index', [
            'programs' => [$programData],
        ]);
    }
}
