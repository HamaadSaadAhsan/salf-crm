<?php

namespace App\Http\Controllers;

use App\Models\LeadSource;
use App\Models\Office;
use App\Models\Service;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('reports/index');
    }

    public function show(string $type): Response
    {
        $validTypes = [
            'leads-overall',
            'leads-by-office',
            'leads-by-support-agent',
            'leads-by-sales-rep',
            'leads-by-source',
            'leads-by-service',
            'leads-conversion',
            'leads-lost',
        ];

        if (! in_array($type, $validTypes)) {
            abort(404);
        }

        $page = 'reports/'.str_replace('-', '-', $type);

        return Inertia::render($page, [
            'offices' => fn () => Office::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'services' => fn () => Service::orderBy('name')->get(['id', 'name']),
            'sources' => fn () => LeadSource::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'reportType' => $type,
        ]);
    }
}
