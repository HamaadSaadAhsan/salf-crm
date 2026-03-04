<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadFolder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadFolderController extends Controller
{
    public function index(Lead $lead): JsonResponse
    {
        $folders = $lead->folders()
            ->orderBy('name')
            ->get()
            ->map(fn (LeadFolder $folder) => [
                'id' => $folder->id,
                'name' => $folder->name,
                'created_at' => $folder->created_at->toISOString(),
            ]);

        return response()->json(['data' => $folders]);
    }

    public function store(Request $request, Lead $lead): JsonResponse
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $folder = $lead->folders()->create([
            'name' => $request->input('name'),
        ]);

        return response()->json([
            'data' => [
                'id' => $folder->id,
                'name' => $folder->name,
                'created_at' => $folder->created_at->toISOString(),
            ],
        ], 201);
    }

    public function rename(Request $request, Lead $lead, LeadFolder $folder): JsonResponse
    {
        abort_unless($folder->lead_id === $lead->id, 404);

        $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $folder->update(['name' => $request->input('name')]);

        return response()->json(['message' => 'Folder renamed successfully.']);
    }

    public function destroy(Lead $lead, LeadFolder $folder): JsonResponse
    {
        abort_unless($folder->lead_id === $lead->id, 404);

        // Remove folder_id from any files in this folder
        $lead->getMedia('files')->each(function ($media) use ($folder) {
            $folderId = $media->getCustomProperty('folder_id');
            if ($folderId && (int) $folderId === $folder->id) {
                $media->forgetCustomProperty('folder_id');
                $media->save();
            }
        });

        $folder->delete();

        return response()->json(['message' => 'Folder deleted successfully.']);
    }
}
