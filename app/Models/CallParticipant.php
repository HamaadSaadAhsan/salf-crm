<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallParticipant extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'joined_at' => 'datetime',
            'left_at' => 'datetime',
            'is_muted' => 'boolean',
            'is_video_enabled' => 'boolean',
            'media_stats' => 'array',
        ];
    }

    protected $fillable = [
        'call_session_id',
        'user_id',
        'sip_account_id',
        'participant_type',
        'status',
        'joined_at',
        'left_at',
        'is_muted',
        'is_video_enabled',
        'media_stats',
    ];

    public function callSession(): BelongsTo
    {
        return $this->belongsTo(CallSession::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sipAccount(): BelongsTo
    {
        return $this->belongsTo(SipAccount::class);
    }

    public function join(): void
    {
        $this->update([
            'status' => 'joined',
            'joined_at' => now(),
        ]);
    }

    public function leave(string $reason = 'hangup'): void
    {
        $this->update([
            'status' => 'left',
            'left_at' => now(),
        ]);
    }

    public function mute(): void
    {
        $this->update([
            'is_muted' => true,
            'status' => 'muted',
        ]);
    }

    public function unmute(): void
    {
        $this->update([
            'is_muted' => false,
            'status' => 'joined',
        ]);
    }

    public function enableVideo(): void
    {
        $this->update(['is_video_enabled' => true]);
    }

    public function disableVideo(): void
    {
        $this->update(['is_video_enabled' => false]);
    }

    public function updateMediaStats(array $stats): void
    {
        $this->update(['media_stats' => $stats]);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['invited', 'ringing', 'joined']);
    }

    public function getDuration(): ?int
    {
        if ($this->joined_at && $this->left_at) {
            return $this->left_at->diffInSeconds($this->joined_at);
        }

        return null;
    }
}
