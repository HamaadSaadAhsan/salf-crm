<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CalendarIntegration extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'google_account_email',
        'access_token',
        'refresh_token',
        'token_expires_at',
        'is_active',
        'sync_preferences'
    ];

    protected $casts = [
        'token_expires_at' => 'datetime',
        'is_active' => 'boolean',
        'sync_preferences' => 'array',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::random(25);
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if the access token is expired
     */
    public function isTokenExpired(): bool
    {
        return $this->token_expires_at->isPast();
    }

    /**
     * Get default sync preferences
     */
    public function getDefaultSyncPreferences(): array
    {
        return [
            'syncTickets' => true,
            'syncFollowUps' => true,
            'defaultCalendarId' => 'primary'
        ];
    }

    /**
     * Scope to get active integrations only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get integrations with valid (non-expired) tokens
     */
    public function scopeWithValidTokens($query)
    {
        return $query->where('token_expires_at', '>', now());
    }
}
