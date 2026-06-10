<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('settings/security', [
            'passkeys' => $user->passkeys()
                ->latest()
                ->get()
                ->map(fn ($passkey): array => [
                    'id' => $passkey->id,
                    'name' => $passkey->name,
                    'last_used_at' => $passkey->last_used_at?->toIso8601String(),
                    'created_at' => $passkey->created_at?->toIso8601String(),
                ])
                ->all(),
            'twoFactorEnabled' => ! is_null($user->two_factor_secret) && ! is_null($user->two_factor_confirmed_at),
        ]);
    }
}
