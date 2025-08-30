<?php

namespace App\Http\Controllers\Api\Otp;

use App\Http\Controllers\Controller;
use App\Models\Otp;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OtpController extends Controller
{
    public function __construct(
        private readonly OtpService $otpService
    ) {}

    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => 'required|string',
            'type' => ['required', Rule::in(array_keys(Otp::TYPES))],
            'metadata' => 'nullable|array',
        ]);

        try {
            $otp = $this->otpService->generate(
                $validated['identifier'],
                $validated['type'],
                $validated['metadata'] ?? []
            );

            return response()->json([
                'message' => 'OTP sent successfully',
                'expires_at' => $otp->expires_at,
                'expires_in_minutes' => Otp::EXPIRY_MINUTES,
                'expiresIn' => Otp::EXPIRY_MINUTES
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send OTP',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => 'required|string',
            'token' => 'required|string|size:6',
            'type' => ['required', Rule::in(array_keys(Otp::TYPES))],
        ]);

        $result = $this->otpService->verify(
            $validated['identifier'],
            $validated['token'],
            $validated['type']
        );

        $statusCode = $result['success'] ? 200 : 400;

        return response()->json($result, $statusCode);
    }

    public function resend(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => 'required|string',
            'type' => ['required', Rule::in(array_keys(Otp::TYPES))],
        ]);

        $result = $this->otpService->resend(
            $validated['identifier'],
            $validated['type']
        );

        $statusCode = $result['success'] ? 200 : 429;

        return response()->json($result, $statusCode);
    }
}
