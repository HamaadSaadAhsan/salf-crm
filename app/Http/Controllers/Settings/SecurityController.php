<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

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
                    'authenticator' => $passkey->authenticator,
                    'created_at_diff' => $passkey->created_at?->diffForHumans(),
                    'last_used_at_diff' => $passkey->last_used_at?->diffForHumans(),
                ])
                ->all(),
            'canManagePasskeys' => Features::canManagePasskeys(),
            'twoFactorEnabled' => ! is_null($user->two_factor_secret) && ! is_null($user->two_factor_confirmed_at),
        ]);
    }
}
