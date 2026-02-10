<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Database\Eloquent\BroadcastsEvents;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CallSession extends Model
{
    use BelongsToOrganization, BroadcastsEvents, HasFactory;

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'answered_at' => 'datetime',
            'ended_at' => 'datetime',
            'is_coverage_call' => 'boolean',
        ];
    }

    protected $fillable = [
        'organization_id',
        'session_id',
        'uniqueid',
        'caller_id',
        'answered_by_user_id',
        'intended_for_user_id',
        'is_coverage_call',
        'lead_id',
        'caller_sip_account_id',
        'callee_sip_account_id',
        'call_direction',
        'call_type',
        'status',
        'caller_number',
        'callee_number',
        'started_at',
        'answered_at',
        'ended_at',
        'duration',
        'end_reason',
        'call_signature',
        'recording_path',
    ];

    protected static function booted(): void
    {
        static::creating(function (CallSession $callSession) {
            if (empty($callSession->session_id)) {
                $callSession->session_id = Str::uuid();
            }

            // Generate call signature for outbound calls
            if ($callSession->call_direction === 'outbound' && empty($callSession->call_signature)) {
                $callSession->call_signature = self::generateCallSignature(
                    $callSession->lead_id,
                    $callSession->caller_id
                );
            }
        });
    }

    /**
     * Generate a unique call signature for tracking and recording retrieval
     * Format: LEAD_{lead_id}_USER_{user_id}_{timestamp}_{random}
     */
    public static function generateCallSignature(?string $leadId, ?int $userId): string
    {
        $timestamp = now()->format('Y-m-d-His');
        $random = strtoupper(Str::random(6));

        $parts = [
            'LEAD',
            $leadId ?? 'NONE',
            'USER',
            $userId ?? 'NONE',
            $timestamp,
            $random,
        ];

        return implode('-', $parts);
    }

    public function caller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caller_id');
    }

    public function answeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'answered_by_user_id');
    }

    public function intendedFor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'intended_for_user_id');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'lead_id');
    }

    public function callerSipAccount(): BelongsTo
    {
        return $this->belongsTo(SipAccount::class, 'caller_sip_account_id');
    }

    public function calleeSipAccount(): BelongsTo
    {
        return $this->belongsTo(SipAccount::class, 'callee_sip_account_id');
    }

    public function callLogs(): HasMany
    {
        return $this->hasMany(CallLog::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(CallParticipant::class);
    }

    public function broadcastOn(string $event): array
    {
        return [
            new PrivateChannel('call-session.'.$this->session_id),
            new PrivateChannel('user.'.$this->caller_id),
        ];
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['initiated', 'ringing', 'answered']);
    }

    public function isCompleted(): bool
    {
        return in_array($this->status, ['ended', 'failed', 'cancelled']);
    }

    public function getDurationInMinutes(): ?int
    {
        return $this->duration ? ceil($this->duration / 60) : null;
    }

    public function calculateDuration(): ?int
    {
        if ($this->answered_at && $this->ended_at) {
            return $this->ended_at->diffInSeconds($this->answered_at);
        }

        return null;
    }

    public function markAsAnswered(): void
    {
        $this->update([
            'status' => 'answered',
            'answered_at' => now(),
        ]);
    }

    public function markAsEnded(string $reason = 'hangup'): void
    {
        $endedAt = now();
        $duration = $this->answered_at ? $endedAt->diffInSeconds($this->answered_at) : null;

        $this->update([
            'status' => 'ended',
            'ended_at' => $endedAt,
            'duration' => $duration,
            'end_reason' => $reason,
        ]);
    }
}
