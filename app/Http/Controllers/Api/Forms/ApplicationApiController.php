<?php

namespace App\Http\Controllers\Api\Forms;

use App\Enums\Forms\ApplicationStatus;
use App\Http\Controllers\Controller;
use App\Jobs\Forms\GenerateApplicationFormsJob;
use App\Models\Forms\Application;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationApiController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'program_id' => ['required', 'integer', 'exists:programs,id'],
            'main_applicant_name' => ['nullable', 'string', 'max:255'],
            'main_applicant_passport' => ['nullable', 'string', 'max:100'],
            'data' => ['required', 'array'],
        ]);

        $application = Application::create([
            'program_id' => $request->integer('program_id'),
            'application_code' => Application::generateApplicationCode(),
            'main_applicant_name' => $request->string('main_applicant_name')->toString() ?: null,
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
            'redirect' => "/settings/management/forms/applications/{$application->id}",
        ], 201);
    }

    public function update(Request $request, Application $application): JsonResponse
    {
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

    public function destroy(Application $application): JsonResponse
    {
        $application->delete();

        return response()->json(['message' => 'Application deleted.']);
    }

    public function generate(Application $application): JsonResponse
    {
        GenerateApplicationFormsJob::dispatch($application->id, auth()->id());

        return response()->json(['message' => 'Generation queued.']);
    }
}
