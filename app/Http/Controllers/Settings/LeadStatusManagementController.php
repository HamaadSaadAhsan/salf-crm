<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Status;
use Inertia\Inertia;
use Inertia\Response;

class LeadStatusManagementController extends Controller
{
    public function index(): Response
    {
        $statuses = Status::query()
            ->orderBy('order')
            ->get()
            ->map(fn ($status) => [
                'id' => $status->id,
                'name' => $status->name,
                'color' => $status->color,
                'order' => $status->order,
                'created_at' => $status->created_at?->toISOString(),
                'updated_at' => $status->updated_at?->toISOString(),
            ]);

        // Get status options from Lead model for reference
        $leadStatusOptions = Lead::getStatusOptions();

        return Inertia::render('settings/management/lead-statuses/index', [
            'statuses' => $statuses,
            'leadStatusOptions' => $leadStatusOptions,
        ]);
    }
}
