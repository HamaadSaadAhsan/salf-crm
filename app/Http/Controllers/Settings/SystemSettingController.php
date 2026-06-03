<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\PhoneReveal;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SystemSettingController extends Controller
{
    public function index(Request $request): Response
    {
        $reveals = PhoneReveal::query()
            ->with(['user:id,name,email', 'lead:id,name,phone'])
            ->latest('revealed_at')
            ->paginate(20)
            ->through(fn ($r) => [
                'id' => $r->id,
                'user' => $r->user ? ['name' => $r->user->name, 'email' => $r->user->email] : null,
                'lead' => $r->lead ? ['id' => $r->lead->id, 'name' => $r->lead->name] : null,
                'ip_address' => $r->ip_address,
                'revealed_at' => $r->revealed_at,
                'expires_at' => $r->expires_at,
            ]);

        return Inertia::render('settings/system', [
            'settings' => SystemSetting::asArray(),
            'reveals' => $reveals,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'calling_enabled' => 'sometimes|boolean',
            'phone_reveal_duration' => 'sometimes|integer|min:10|max:300',
        ]);

        foreach ($request->only(['calling_enabled', 'phone_reveal_duration']) as $key => $value) {
            SystemSetting::set($key, $value);
        }

        return response()->json([
            'success' => true,
            'settings' => SystemSetting::asArray(),
        ]);
    }
}
