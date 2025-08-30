<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Random\RandomException;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * @throws RandomException
     */
    public function register(Request $request, OtpService $otpService)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $otpService->generate($user->email, 'email_verification');

        return response()->json([
            'message' => 'User registered successfully.',
        ], 201);
    }

    /**
     * @throws RandomException
     */
    public function login(Request $request, OtpService $otpService)
    {

        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'The provided credentials are incorrect.',
                'errors' => [
                    'email' => ['The provided credentials are incorrect.']
                ]
            ], 422);
        }

        $token = $user->createToken('authToken', ['*'] , now()->addMinutes(30))->plainTextToken;
        $user->load(['roles.permissions', 'permissions']);

        if (!$user->hasVerifiedEmail()) {
            $otpService->generate($user->email, 'email_verification');
        }

        Log::info('User logged in successfully', [
            'user_id' => $user->id,
            'email' => $user->email,
            'ip_address' => $request->ip()
        ]);

        return response()->json([
            'success' => true,
            'user' => [
                'id' => encrypt($user->id),
                'name' => $user->name,
                'email' => $user->email,
                'isVerified' => $user->hasVerifiedEmail(),
                'roles' => $user->roles->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'permissions' => $role->permissions->map(function ($permission) {
                            return [
                                'id' => $permission->id,
                                'name' => $permission->name,
                                'resource' => $this->extractResource($permission->name),
                                'action' => $this->extractAction($permission->name),
                            ];
                        })
                    ];
                }),
                // Include direct permissions (if any)
                'direct_permissions' => $user->permissions->map(function ($permission) {
                    return [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'resource' => $this->extractResource($permission->name),
                        'action' => $this->extractAction($permission->name),
                    ];
                })
            ],
            'access_token' => $token,
            'message' => 'Login successful',
        ], Response::HTTP_OK);
    }

    private function extractResource($permissionName)
    {
        // Assuming permission format: "action resource" (e.g., "view posts", "create users")
        $parts = explode(' ', $permissionName);
        return count($parts) > 1 ? $parts[1] : 'general';
    }

    private function extractAction($permissionName)
    {
        $parts = explode(' ', $permissionName);
        return $parts[0];
    }

    public function logout(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $dbUser = User::find($user->id);

            Log::info('Logout attempt', [
                'user_id' => $user?->id,
                'ip_address' => $request->ip(),
                'db_user_id' => $dbUser?->id,
            ]);


            if (!$user || !$dbUser) {
                PersonalAccessToken::where('tokenable_id', $user->id)->delete();

                return response()->json([
                    'message' => 'User not authenticated',
                    'success' => false
                ], 401);
            }

            $user->tokens()->delete();

            Log::info('User logged out successfully', [
                'user_id' => $user->id,
                'ip_address' => $request->ip()
            ]);

            return response()->json([
                'message' => 'Successfully logged out',
                'success' => true
            ], 200);

        } catch (\Exception $e) {
            Log::error('Logout failed', [
                'error' => $e->getMessage(),
                'user_id' => $request->user()?->id,
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Logout failed',
                'error' => 'An error occurred during logout',
                'success' => false
            ], 500);
        }
    }
}
