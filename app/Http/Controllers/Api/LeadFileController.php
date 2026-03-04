<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadFileController extends Controller
{
    /**
     * List all files for a lead.
     */
    public function index(Lead $lead): JsonResponse
    {
        $files = $lead->getMedia('files')->map(fn (Media $media) => [
            'id' => $media->id,
            'name' => $media->name,
            'file_name' => $media->file_name,
            'mime_type' => $media->mime_type,
            'size' => $media->size,
            'human_readable_size' => $media->human_readable_size,
            'url' => $media->getUrl(),
            'thumb_url' => $media->hasGeneratedConversion('thumb') ? $media->getUrl('thumb') : null,
            'created_at' => $media->created_at->toISOString(),
            'custom_properties' => $media->custom_properties,
            'folder_id' => $media->getCustomProperty('folder_id'),
        ]);

        return response()->json(['data' => $files]);
    }

    /**
     * Upload file(s) to a lead.
     */
    public function store(Request $request, Lead $lead): JsonResponse
    {
        $request->validate([
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['required', 'file', 'max:20480'], // 20MB max per file
            'folder_id' => ['nullable', 'integer', 'exists:lead_folders,id'],
        ]);

        $customProperties = [
            'uploaded_by' => auth()->id(),
            'uploaded_by_name' => auth()->user()->name,
        ];

        if ($request->filled('folder_id')) {
            $customProperties['folder_id'] = (int) $request->input('folder_id');
        }

        $uploaded = [];

        foreach ($request->file('files') as $file) {
            $media = $lead->addMedia($file)
                ->usingName(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME))
                ->withCustomProperties($customProperties)
                ->toMediaCollection('files');

            $uploaded[] = [
                'id' => $media->id,
                'name' => $media->name,
                'file_name' => $media->file_name,
                'mime_type' => $media->mime_type,
                'size' => $media->size,
                'human_readable_size' => $media->human_readable_size,
                'url' => $media->getUrl(),
                'thumb_url' => $media->hasGeneratedConversion('thumb') ? $media->getUrl('thumb') : null,
                'created_at' => $media->created_at->toISOString(),
                'custom_properties' => $media->custom_properties,
                'folder_id' => $media->getCustomProperty('folder_id'),
            ];
        }

        return response()->json(['data' => $uploaded], 201);
    }

    /**
     * Download a file.
     */
    public function download(Lead $lead, Media $media): StreamedResponse
    {
        abort_unless($media->model_id === $lead->id && $media->model_type === Lead::class, 404);

        return response()->streamDownload(function () use ($media) {
            echo file_get_contents($media->getPath());
        }, $media->file_name, [
            'Content-Type' => $media->mime_type,
        ]);
    }

    /**
     * Rename a file.
     */
    public function rename(Request $request, Lead $lead, Media $media): JsonResponse
    {
        abort_unless($media->model_id === $lead->id && $media->model_type === Lead::class, 404);

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $extension = pathinfo($media->file_name, PATHINFO_EXTENSION);
        $media->file_name = $request->input('name').'.'.$extension;
        $media->name = $request->input('name');
        $media->save();

        return response()->json(['message' => 'File renamed successfully.']);
    }

    /**
     * Move a file to a folder (or root).
     */
    public function moveToFolder(Request $request, Lead $lead, Media $media): JsonResponse
    {
        abort_unless($media->model_id === $lead->id && $media->model_type === Lead::class, 404);

        $request->validate([
            'folder_id' => ['nullable', 'integer', 'exists:lead_folders,id'],
        ]);

        if ($request->filled('folder_id')) {
            $media->setCustomProperty('folder_id', (int) $request->input('folder_id'));
        } else {
            $media->forgetCustomProperty('folder_id');
        }

        $media->save();

        return response()->json(['message' => 'File moved successfully.']);
    }

    /**
     * Delete a file.
     */
    public function destroy(Lead $lead, Media $media): JsonResponse
    {
        abort_unless($media->model_id === $lead->id && $media->model_type === Lead::class, 404);

        $media->delete();

        return response()->json(['message' => 'File deleted successfully.']);
    }
}
