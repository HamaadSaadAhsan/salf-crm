<?php

namespace App\Http\Controllers;

use App\Models\CalendarIntegration;
use App\Models\GmailIntegration;
use App\Models\Integration;
use Inertia\Inertia;

class IntegrationController extends Controller
{
    public function index()
    {
        $userId = request()->user()->id;
        $facebookIntegration = Integration::where('provider', 'facebook')->first();
        $calendarIntegration = CalendarIntegration::where('user_id', $userId)->first();
        $gmailIntegration = GmailIntegration::where('user_id', $userId)->where('is_active', true)->first();

        return inertia('integrations/index', [
            'statuses' => [
                'facebook' => $facebookIntegration?->active ?? false,
                'whatsapp' => false,
                'calendar' => (bool) $calendarIntegration?->is_active,
                'gmail' => (bool) $gmailIntegration,
                'gmailEmail' => $gmailIntegration?->google_account_email,
            ],
        ]);
    }

    public function facebook()
    {
        return Inertia::render('integrations/facebook/index');
    }
}
