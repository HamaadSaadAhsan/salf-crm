<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\LeadSource;
use Inertia\Inertia;
use Inertia\Response;

class LeadSourceManagementController extends Controller
{
    public function index(): Response
    {
        $leadSources = LeadSource::query()
            ->withCount('leads')
            ->orderBy('name')
            ->get()
            ->map(fn ($source) => [
                'id' => $source->id,
                'name' => $source->name,
                'slug' => $source->slug,
                'identifier' => $source->identifier,
                'status' => $source->status,
                'source_score' => $source->source_score ?? 0,
                'is_active' => $source->isActive(),
                'leads_count' => $source->leads_count ?? 0,
                'created_at' => $source->created_at?->toISOString(),
                'updated_at' => $source->updated_at?->toISOString(),
            ]);

        return Inertia::render('settings/management/lead-sources/index', [
            'leadSources' => $leadSources,
        ]);
    }
}
