<?php

namespace App\Http\Controllers;

use App\Models\CalendarIntegration;
use App\Models\Integration;
use Inertia\Inertia;

class IntegrationController extends Controller
{
    public function index()
    {
        $facebookIntegration = Integration::where('provider', 'facebook')->first();
        $calendarIntegration = CalendarIntegration::where('user_id', request()->user()->id)->first();

        return inertia('integrations/index', [
            'statuses' => [
                'facebook' => $facebookIntegration?->active ?? false,
                'whatsapp' => false,
                'calendar' => (bool) $calendarIntegration?->is_active,
            ],
        ]);
    }

    public function facebook()
    {
        return Inertia::render('integrations/facebook/index');
    }
}
