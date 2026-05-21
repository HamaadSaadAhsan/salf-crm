<?php

namespace App\Http\Controllers\Settings\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\Application;
use App\Models\Forms\Program;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationsController extends Controller
{
    public function index(): Response
    {
        $applications = Application::query()
            ->with([
                'program:id,name,code',
                'createdBy:id,name',
            ])
            ->withMax('generations', 'created_at')
            ->latest()
            ->paginate(25)
            ->through(fn (Application $app) => [
                'id' => $app->id,
                'application_code' => $app->application_code,
                'main_applicant_name' => $app->main_applicant_name,
                'main_applicant_passport' => $app->main_applicant_passport,
                'status' => $app->status->value,
                'created_at' => $app->created_at->toISOString(),
                'program' => $app->program ? ['id' => $app->program->id, 'name' => $app->program->name, 'code' => $app->program->code] : null,
                'created_by' => $app->createdBy ? ['id' => $app->createdBy->id, 'name' => $app->createdBy->name] : null,
            ]);

        return Inertia::render('settings/management/forms/applications/index', [
            'applications' => $applications,
        ]);
    }

    public function create(): Response
    {
        $programs = Program::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'country_code']);

        return Inertia::render('settings/management/forms/applications/create', [
            'programs' => $programs,
        ]);
    }

    public function show(Application $application): Response
    {
        $application->load([
            'program:id,name,code,country_code',
            'createdBy:id,name',
            'assignedTo:id,name',
            'generations' => fn ($q) => $q->with('generatedBy:id,name')->latest(),
        ]);

        return Inertia::render('settings/management/forms/applications/show', [
            'application' => [
                'id' => $application->id,
                'application_code' => $application->application_code,
                'main_applicant_name' => $application->main_applicant_name,
                'main_applicant_passport' => $application->main_applicant_passport,
                'status' => $application->status->value,
                'data' => $application->data,
                'submitted_at' => $application->submitted_at?->toISOString(),
                'created_at' => $application->created_at->toISOString(),
                'program' => $application->program ? [
                    'id' => $application->program->id,
                    'name' => $application->program->name,
                    'code' => $application->program->code,
                ] : null,
                'created_by' => $application->createdBy ? ['id' => $application->createdBy->id, 'name' => $application->createdBy->name] : null,
                'assigned_to' => $application->assignedTo ? ['id' => $application->assignedTo->id, 'name' => $application->assignedTo->name] : null,
                'generations' => $application->generations->map(fn ($g) => [
                    'id' => $g->id,
                    'status' => $g->status->value,
                    'file_count' => $g->file_count,
                    'output_path' => $g->output_path,
                    'generation_log' => $g->generation_log,
                    'error_message' => $g->error_message,
                    'started_at' => $g->started_at?->toISOString(),
                    'completed_at' => $g->completed_at?->toISOString(),
                    'created_at' => $g->created_at->toISOString(),
                    'generated_by' => $g->generatedBy ? ['id' => $g->generatedBy->id, 'name' => $g->generatedBy->name] : null,
                ]),
            ],
        ]);
    }

    public function edit(Application $application): Response
    {
        $application->load('program:id,name,code');

        $programs = Program::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'country_code']);

        return Inertia::render('settings/management/forms/applications/create', [
            'application' => [
                'id' => $application->id,
                'application_code' => $application->application_code,
                'main_applicant_name' => $application->main_applicant_name,
                'main_applicant_passport' => $application->main_applicant_passport,
                'status' => $application->status->value,
                'data' => $application->data,
                'program_id' => $application->program_id,
            ],
            'programs' => $programs,
        ]);
    }
}
