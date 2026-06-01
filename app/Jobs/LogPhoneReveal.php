<?php

namespace App\Jobs;

use App\Models\LeadActivity;
use App\Models\PhoneReveal;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class LogPhoneReveal implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $userId,
        public readonly string $leadId,
        public readonly ?string $ipAddress,
        public readonly ?string $userAgent,
        public readonly int $duration,
    ) {}

    public function handle(): void
    {
        PhoneReveal::create([
            'user_id' => $this->userId,
            'lead_id' => $this->leadId,
            'ip_address' => $this->ipAddress,
            'user_agent' => $this->userAgent,
            'revealed_at' => now(),
            'expires_at' => now()->addSeconds($this->duration),
        ]);

        LeadActivity::create([
            'lead_id' => $this->leadId,
            'user_id' => $this->userId,
            'type' => 'phone_reveal',
            'subject' => 'Phone number revealed',
            'status' => 'completed',
            'completed_at' => now(),
            'metadata' => [
                'ip_address' => $this->ipAddress,
                'duration_seconds' => $this->duration,
                'expires_at' => now()->addSeconds($this->duration)->toISOString(),
            ],
        ]);
    }
}
