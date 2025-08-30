<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Otp extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<string>
     */
    protected $fillable = [
        'identifier',
        'token',
        'type',
        'expires_at',
        'verified_at',
        'attempts',
        'used',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'metadata' => 'array',
            'used' => 'boolean',
        ];
    }

    const TYPES = [
        'email_verification' => 'email_verification',
        'phone_verification' => 'phone_verification',
        'password_reset' => 'password_reset',
        'login_verification' => 'login_verification',
    ];
    const MAX_ATTEMPTS = 3;
    const EXPIRY_MINUTES = 10;

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used;
    }

    public function isVerified(): bool
    {
        return !is_null($this->verified_at);
    }

    public function canAttempt(): bool
    {
        return $this->attempts < self::MAX_ATTEMPTS;
    }

    public function markAsUsed(): void
    {
        $this->update([
            'used' => true,
            'verified_at' => now(),
        ]);

        $this->user->email_verified_at = now();
        $this->user->update();
    }

    public function incrementAttempts(): void
    {
        $this->attempts++;
        $this->save();
    }

    // Scopes
    public function scopeValid($query)
    {
        return $query->where('expires_at', '>', now())
            ->where('used', false);
    }

    public function scopeForIdentifier($query, string $identifier)
    {
        return $query->where('identifier', $identifier);
    }

    public function scopeForType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'identifier', 'email');
    }
}
