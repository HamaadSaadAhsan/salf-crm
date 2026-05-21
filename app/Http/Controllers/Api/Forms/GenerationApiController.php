<?php

namespace App\Http\Controllers\Api\Forms;

use App\Enums\Forms\GenerationStatus;
use App\Http\Controllers\Controller;
use App\Models\Forms\Application;
use App\Models\Forms\ApplicationGeneration;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class GenerationApiController extends Controller
{
    public function index(Application $application): JsonResponse
    {
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

    public function download(ApplicationGeneration $generation): BinaryFileResponse|JsonResponse
    {
        if ($generation->status !== GenerationStatus::COMPLETED || ! $generation->output_path) {
            return response()->json(['error' => 'Generation is not complete.'], 422);
        }

        $disk = Storage::disk(config('forms.output_disk'));

        if (! $disk->exists($generation->output_path)) {
            return response()->json(['error' => 'Bundle file not found.'], 404);
        }

        $filename = basename($generation->output_path);

        return response()->download($disk->path($generation->output_path), $filename);
    }
}
