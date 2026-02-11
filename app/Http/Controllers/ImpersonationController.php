<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ImpersonationController extends Controller
{
    /**
     * Start impersonating a user.
     */
    public function impersonate(Request $request, User $user): RedirectResponse
    {
        $currentUser = $request->user();

        // Only super-admins can impersonate
        if (! $currentUser->hasRole('super-admin')) {
            abort(403, 'Only super administrators can impersonate users.');
        }

        // Cannot impersonate yourself
        if ($currentUser->id === $user->id) {
            return back()->with('error', 'You cannot impersonate yourself.');
        }

        // Cannot impersonate another super-admin
        if ($user->hasRole('super-admin')) {
            return back()->with('error', 'You cannot impersonate another super administrator.');
        }

        // Store the original user ID in the session
        session()->put('impersonator_id', $currentUser->id);
        session()->put('impersonator_name', $currentUser->name);

        Log::info('User impersonation started', [
            'impersonator_id' => $currentUser->id,
            'impersonator_name' => $currentUser->name,
            'impersonated_id' => $user->id,
            'impersonated_name' => $user->name,
        ]);

        // Login as the target user
        Auth::login($user);

        return redirect()->route('dashboard')->with('success', "You are now impersonating {$user->name}.");
    }

    /**
     * Stop impersonating and return to original user.
     */
    public function leave(Request $request): RedirectResponse
    {
        $impersonatorId = session()->get('impersonator_id');

        if (! $impersonatorId) {
            return redirect()->route('dashboard')->with('error', 'You are not impersonating anyone.');
        }

        $impersonator = User::find($impersonatorId);

        if (! $impersonator) {
            // Clear session and logout if original user doesn't exist
            session()->forget(['impersonator_id', 'impersonator_name']);
            Auth::logout();

            return redirect()->route('login')->with('error', 'Original user not found.');
        }

        $impersonatedUser = $request->user();

        Log::info('User impersonation ended', [
            'impersonator_id' => $impersonator->id,
            'impersonator_name' => $impersonator->name,
            'impersonated_id' => $impersonatedUser->id,
            'impersonated_name' => $impersonatedUser->name,
        ]);

        // Clear impersonation session data
        session()->forget(['impersonator_id', 'impersonator_name']);

        // Login back as the original user
        Auth::login($impersonator);

        return redirect()->route('users.page')->with('success', 'You have stopped impersonating and returned to your account.');
    }

    /**
     * Check if the current user is being impersonated.
     */
    public static function isImpersonating(): bool
    {
        return session()->has('impersonator_id');
    }

    /**
     * Get the impersonator details.
     */
    public static function getImpersonator(): ?array
    {
        if (! self::isImpersonating()) {
            return null;
        }

        return [
            'id' => session()->get('impersonator_id'),
            'name' => session()->get('impersonator_name'),
        ];
    }
}
