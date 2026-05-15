<?php

namespace App\Http\Controllers;

use App\Models\CalendarIntegration;
use App\Models\GmailIntegration;
use Inertia\Inertia;

class IntegrationController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        $calendarIntegration = CalendarIntegration::where('user_id', $user->id)->first();
        $gmailIntegration = GmailIntegration::where('user_id', $user->id)->where('is_active', true)->first();

        return inertia('integrations/index', [
            'statuses' => [
                'facebook' => $user->hasFacebookToken() && ! $user->isFacebookTokenExpired(),
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
