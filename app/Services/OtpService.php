<?php

namespace App\Services;

use App\Mail\OtpMail;
use App\Models\Otp;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;
use Random\RandomException;

class OtpService
{
    /**
     * @throws RandomException
     */
    public function generate(
        string $identifier,
        string $type,
        array $metadata = []
    ): Otp {
        // Invalidate existing OTPs for this identifier and type
        $this->invalidateExisting($identifier, $type);

        // Generate 6-digit numeric OTP
        $token = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $otp = Otp::create([
            'identifier' => $identifier,
            'token' => $token,
            'type' => $type,
            'expires_at' => Carbon::now()->addMinutes(Otp::EXPIRY_MINUTES),
            'metadata' => $metadata,
        ]);

        // Send OTP based on type
        $this->sendOtp($otp);

        return $otp;
    }

    public function verify(
        string $identifier,
        string $token,
        string $type
    ): array {

        $otp = Otp::forIdentifier($identifier)
            ->forType($type)
            ->valid()
            ->where('token', $token)
            ->first();


        if (!$otp) {
            return [
                'success' => false,
                'message' => 'Invalid or expired OTP',
                'code' => 'INVALID_OTP'
            ];
        }

        if ($otp->isExpired()) {
            return [
                'success' => false,
                'message' => 'OTP has expired',
                'code' => 'EXPIRED_OTP'
            ];
        }

        if (!$otp->canAttempt()) {
            return [
                'success' => false,
                'message' => 'Maximum verification attempts exceeded',
                'code' => 'MAX_ATTEMPTS_EXCEEDED'
            ];
        }

        // Mark as verified and used
        $otp->markAsUsed();

        return [
            'success' => true,
            'message' => 'OTP verified successfully',
            'otp' => $otp,
            'verified' => $otp->user->hasVerifiedEmail(),
        ];
    }

    /**
     * @throws RandomException
     */
    public function resend(string $identifier, string $type): array
    {
        // Check if we can resend (rate limiting)
        $recentOtp = Otp::forIdentifier($identifier)
            ->forType($type)
            ->where('created_at', '>', Carbon::now()->subMinutes(1))
            ->first();

        if ($recentOtp) {
            return [
                'success' => false,
                'message' => 'Please wait before requesting another OTP',
                'code' => 'RATE_LIMITED'
            ];
        }

        // Generate new OTP
        $otp = $this->generate($identifier, $type);

        return [
            'success' => true,
            'message' => 'OTP sent successfully',
            'expires_at' => $otp->expires_at
        ];
    }

    private function invalidateExisting(string $identifier, string $type): void
    {
        Otp::forIdentifier($identifier)
            ->forType($type)
            ->valid()
            ->update(['used' => true]);
    }

    private function sendOtp(Otp $otp): void
    {
        switch ($otp->type) {
            case Otp::TYPES['email_verification']:
            case Otp::TYPES['password_reset']:
            case Otp::TYPES['login_verification']:
                Mail::to($otp->identifier)->send(new OtpMail($otp));
                break;

            case Otp::TYPES['phone_verification']:
                // Implement SMS sending logic
                // Example with a notification:
                // Notification::route('nexmo', $otp->identifier)
                //     ->notify(new SmsOtpNotification($otp));
                break;
        }
    }

    public function cleanup(): int
    {
        // Clean up expired OTPs older than 1 hour
        return Otp::where('expires_at', '<', Carbon::now()->subHour())->delete();
    }
}
