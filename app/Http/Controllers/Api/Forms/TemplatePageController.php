<?php

namespace App\Http\Controllers\Api\Forms;

use App\Exceptions\Forms\FormsServiceException;
use App\Http\Controllers\Controller;
use App\Models\Forms\FormTemplate;
use App\Services\Forms\FormsServiceClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class TemplatePageController extends Controller
{
    public function show(FormTemplate $formTemplate, int $page): Response|JsonResponse
    {
        if ($formTemplate->file_type->value !== 'pdf') {
            return response()->json(['error' => 'Page preview only available for PDF templates.'], 422);
        }

        if ($page < 1 || ($formTemplate->page_count !== null && $page > $formTemplate->page_count)) {
            return response()->json(['error' => 'Page out of range.'], 404);
        }

        try {
            $client = app(FormsServiceClient::class);
            $pngBytes = $client->renderPage($formTemplate->file_path, $page);
        } catch (FormsServiceException $e) {
            return response()->json(['error' => 'Forms service error: '.$e->getMessage()], 502);
        }

        return response($pngBytes, 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'public, max-age=3600',
            'Content-Length' => strlen($pngBytes),
        ]);
    }
}
