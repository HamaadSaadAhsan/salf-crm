<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadGoogleDriveFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LeadGoogleDriveFileController extends Controller
{
    public function index(Lead $lead): JsonResponse
    {
        $files = $lead->googleDriveFiles()
            ->with('storageAccount:id,provider_account_email')
            ->latest()
            ->get();

        return response()->json(['data' => $files]);
    }

    public function store(Request $request, Lead $lead): JsonResponse
    {
        $validated = $request->validate([
            'storage_account_id' => ['required', 'exists:storage_accounts,id'],
            'google_file_id' => ['required', 'string'],
            'file_name' => ['required', 'string', 'max:255'],
            'mime_type' => ['nullable', 'string', 'max:255'],
            'file_size' => ['nullable', 'integer'],
            'icon_link' => ['nullable', 'string', 'url', 'max:2048'],
            'web_view_link' => ['nullable', 'string', 'url', 'max:2048'],
            'thumbnail_link' => ['nullable', 'string', 'url', 'max:2048'],
        ]);

        // Verify the user owns the storage account
        $storageAccount = Auth::user()->storageAccounts()
            ->where('id', $validated['storage_account_id'])
            ->firstOrFail();

        $file = $lead->googleDriveFiles()->create($validated);

        $file->load('storageAccount:id,provider_account_email');

        return response()->json(['data' => $file], 201);
    }

    public function destroy(Lead $lead, LeadGoogleDriveFile $linkedFile): JsonResponse
    {
        abort_unless($linkedFile->lead_id === $lead->id, 404);

        $linkedFile->delete();

        return response()->json(['message' => 'File reference removed.']);
    }
}
