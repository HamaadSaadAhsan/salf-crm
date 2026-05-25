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
            'data' => $request->input('data'),
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

    public function generate(Lead $lead, Application $application): JsonResponse
    {
        abort_if((string) $application->lead_id !== (string) $lead->id, 404);

        GenerateApplicationFormsJob::dispatch($application->id, auth()->id());

        return response()->json(['message' => 'Generation queued.']);
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
