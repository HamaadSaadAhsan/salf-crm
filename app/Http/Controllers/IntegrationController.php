<?php

namespace App\Http\Controllers;

use App\Models\CalendarIntegration;
use App\Models\Integration;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IntegrationController extends Controller
{
    public function index()
    {
        $integrations = Integration::all();
        $calendar = CalendarIntegration::where('user_id', request()->user()->id)
            ->with('user:id,name,email')
            ->get();

        return inertia('integrations/index', [
            'integrations' => $integrations,
            'calendarStatus' => [
                'isLinked' => $calendar->isNotEmpty(),
                'message' => $calendar->isNotEmpty() ? 'Calendar integration connected successfully' : 'Connect your calendar'
            ],
        ]);
    }

    public function facebook()
    {
        return Inertia::render('integrations/facebook/index');
    }
}
