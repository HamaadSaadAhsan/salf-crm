<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    /**
     * Display the account settings page
     */
    public function index(): Response
    {
        return Inertia::render('users/account/home/settings-sidebar/account-basic-page', [
            'user' => Auth::user(),
        ]);
    }

    /**
     * Update the user's profile information
     */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $validated = $request->validated();

            // Handle avatar upload if provided
            if ($request->hasFile('avatar')) {
                // Delete old avatar if exists
                if ($user->avatar) {
                    Storage::disk('public')->delete($user->avatar);
                }

                // Store new avatar
                $avatarPath = $request->file('avatar')->store('avatars', 'public');
                $validated['avatar'] = $avatarPath;
            }

            // Update user profile
            $user->update($validated);

            return response()->json([
                'message' => 'Profile updated successfully.',
                'user' => $user->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update profile.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update the user's password
     */
    public function updatePassword(UpdatePasswordRequest $request): JsonResponse
    {
        try {
            $user = Auth::user();
            $validated = $request->validated();

            // Verify current password
            if (! Hash::check($validated['current_password'], $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect.',
                    'errors' => [
                        'current_password' => ['The current password is incorrect.'],
                    ],
                ], 422);
            }

            // Update password
            $user->update([
                'password' => $validated['password'],
            ]);

            return response()->json([
                'message' => 'Password updated successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update password.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete the user's account
     */
    public function destroy(): RedirectResponse
    {
        try {
            $user = Auth::user();

            // Check if user has leads assigned
            if ($user->leads()->exists()) {
                return back()->with('error', 'Cannot delete account with assigned leads. Please reassign them first.');
            }

            // Detach all relationships
            $user->services()->detach();
            $user->roles()->detach();

            // Delete avatar if exists
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }

            // Logout the user
            Auth::logout();

            // Delete the user
            $user->delete();

            return redirect()->route('home')->with('success', 'Account deleted successfully.');
        } catch (\Exception $e) {
            return back()->with('error', 'Failed to delete account.');
        }
    }

    /**
     * Get the authenticated user's data
     */
    public function show(): JsonResponse
    {
        $user = Auth::user()->load(['roles', 'activeServices']);

        return response()->json([
            'user' => $user,
        ]);
    }
}
