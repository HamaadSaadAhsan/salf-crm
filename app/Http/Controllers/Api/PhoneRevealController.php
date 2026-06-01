<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\LogPhoneReveal;
use App\Models\Lead;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhoneRevealController extends Controller
{
    public function reveal(Request $request, Lead $lead): JsonResponse
    {
        if (! $lead->phone) {
            return response()->json(['message' => 'No phone number on file.'], 404);
        }

        $duration = (int) SystemSetting::get('phone_reveal_duration', 30);

        LogPhoneReveal::dispatch(
            userId: $request->user()->id,
            leadId: (string) $lead->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
            duration: $duration,
        );

        return response()->json([
            'phone' => $lead->phone,
            'duration' => $duration,
            'expires_at' => now()->addSeconds($duration)->toISOString(),
        ]);
    }
}
