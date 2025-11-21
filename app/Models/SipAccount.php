<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SipAccount extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'sip_headers' => 'array',
            'is_enabled' => 'boolean',
            'last_registered_at' => 'datetime',
        ];
    }

    protected $fillable = [
        'user_id',
        'username',
        'password',
        'domain',
        'display_name',
        'port',
        'transport',
        'status',
        'sip_headers',
        'codec_priority',
        'is_enabled',
    ];

    protected $hidden = [
        'password',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function callerSessions(): HasMany
    {
        return $this->hasMany(CallSession::class, 'caller_sip_account_id');
    }

    public function callParticipants(): HasMany
    {
        return $this->hasMany(CallParticipant::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active' && $this->is_enabled;
    }

    public function isRegistered(): bool
    {
        return in_array($this->status, ['registered', 'active']);
    }

    public function getFullSipAddress(): string
    {
        return "sip:{$this->username}@{$this->domain}:{$this->port}";
    }
}
