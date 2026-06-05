<?php

namespace App\Http\Controllers\Api\Forms;

use App\Enums\Forms\ApplicationStatus;
use App\Enums\Forms\GenerationStatus;
use App\Http\Controllers\Controller;
use App\Jobs\Forms\GenerateApplicationFormsJob;
use App\Models\Forms\Application;
use App\Models\Forms\ApplicationGeneration;
use App\Models\Forms\Program;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class LeadApplicationController extends Controller
{
    public function index(Lead $lead): JsonResponse
    {
        $applications = $lead->formsApplications()
            ->with('program')
            ->withCount('generations')
            ->latest()
            ->get()
            ->map(fn (Application $a) => [
                'id' => $a->id,
                'application_code' => $a->application_code,
                'status' => $a->status->value,
                'main_applicant_name' => $a->main_applicant_name,
                'main_applicant_passport' => $a->main_applicant_passport,
                'data' => $a->data,
                'generations_count' => $a->generations_count,
                'program' => [
                    'id' => $a->program->id,
                    'name' => $a->program->name,
                    'code' => $a->program->code,
                ],
                'created_at' => $a->created_at?->toISOString(),
                'updated_at' => $a->updated_at?->toISOString(),
            ]);

        return response()->json(['data' => $applications]);
    }

    public function store(Request $request, Lead $lead): JsonResponse
    {
        $request->validate([
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'main_applicant_name' => ['nullable', 'string', 'max:255'],
            'main_applicant_passport' => ['nullable', 'string', 'max:100'],
            'data' => ['present', 'array'],
        ]);

        $application = Application::create([
            'program_id' => $request->integer('program_id'),
            'lead_id' => $lead->id,
            'application_code' => Application::generateApplicationCode(),
            'main_applicant_name' => $request->string('main_applicant_name')->toString() ?: $lead->name,
            'main_applicant_passport' => $request->string('main_applicant_passport')->toString() ?: null,
            'status' => ApplicationStatus::DRAFT,
            'data' => $request->input('data', []),
            'created_by_user_id' => auth()->id(),
        ]);

        return response()->json([
            'data' => [
                'id' => $application->id,
                'application_code' => $application->application_code,
            ],
        ], 201);
    }

    public function update(Request $request, Lead $lead, Application $application): JsonResponse
    {
        abort_if((string) $application->lead_id !== (string) $lead->id, 404);

        $request->validate([
            'main_applicant_name' => ['nullable', 'string', 'max:255'],
            'main_applicant_passport' => ['nullable', 'string', 'max:100'],
            'data' => ['sometimes', 'array'],
            'status' => ['sometimes', 'string', 'in:draft,in_progress,submitted,approved,rejected,archived'],
        ]);

        $application->update(array_filter([
            'main_applicant_name' => $request->string('main_applicant_name')->toString() ?: null,
            'main_applicant_passport' => $request->string('main_applicant_passport')->toString() ?: null,
            'data' => $request->has('data') ? $request->input('data') : null,
            'status' => $request->has('status') ? ApplicationStatus::from($request->string('status')->toString()) : null,
        ], fn ($v) => $v !== null));

        return response()->json(['message' => 'Application updated.']);
    }

    public function generations(Lead $lead, Application $application): JsonResponse
    {
        abort_if((string) $application->lead_id !== (string) $lead->id, 404);

        $generations = $application->generations()
            ->with('generatedBy:id,name')
            ->latest()
            ->get()
            ->map(fn (ApplicationGeneration $g) => [
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
            ]);

        return response()->json(['data' => $generations]);
    }

    public function generate(Lead $lead, Application $application): JsonResponse
    {
        abort_if((string) $application->lead_id !== (string) $lead->id, 404);

        ApplicationGeneration::where('application_id', $application->id)
            ->whereIn('status', [GenerationStatus::PENDING, GenerationStatus::RUNNING])
            ->update([
                'status' => GenerationStatus::FAILED,
                'error_message' => 'Superseded by new generation request.',
                'completed_at' => now(),
            ]);

        $generation = ApplicationGeneration::create([
            'application_id' => $application->id,
            'generated_by_user_id' => auth()->id(),
            'status' => GenerationStatus::PENDING,
        ]);

        GenerateApplicationFormsJob::dispatch($application->id, $generation->id, auth()->id());

        $generation->load('generatedBy:id,name');

        return response()->json([
            'message' => 'Generation queued.',
            'data' => [
                'id' => $generation->id,
                'status' => $generation->status->value,
                'file_count' => 0,
                'output_path' => null,
                'generation_log' => null,
                'error_message' => null,
                'started_at' => null,
                'completed_at' => null,
                'created_at' => $generation->created_at->toISOString(),
                'generated_by' => $generation->generatedBy
                    ? ['id' => $generation->generatedBy->id, 'name' => $generation->generatedBy->name]
                    : null,
            ],
        ]);
    }

    public function destroy(Lead $lead, Application $application): JsonResponse
    {
        abort_if((string) $application->lead_id !== (string) $lead->id, 404);

        $application->delete();

        return response()->json(['message' => 'Application deleted.']);
    }

    public function downloadGeneration(Lead $lead, ApplicationGeneration $generation): BinaryFileResponse|JsonResponse
    {
        abort_if((string) $generation->application->lead_id !== (string) $lead->id, 404);

        if ($generation->status !== GenerationStatus::COMPLETED || ! $generation->output_path) {
            return response()->json(['error' => 'Generation is not complete.'], 422);
        }

        $disk = Storage::disk(config('forms.output_disk'));

        abort_if(! $disk->exists($generation->output_path), 404);

        return response()->download($disk->path($generation->output_path), basename($generation->output_path));
    }

    public function programs(): JsonResponse
    {
        $programs = Program::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'country_code']);

        return response()->json(['data' => $programs]);
    }
}
