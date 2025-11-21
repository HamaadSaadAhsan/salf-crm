<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CallLog extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'context' => 'array',
            'logged_at' => 'datetime',
        ];
    }

    protected $fillable = [
        'call_session_id',
        'log_level',
        'event_type',
        'message',
        'context',
        'source',
        'logged_at',
    ];

    public function callSession(): BelongsTo
    {
        return $this->belongsTo(CallSession::class);
    }

    public static function createForSession(CallSession $session, string $level, string $eventType, string $message, array $context = [], string $source = 'application'): self
    {
        return self::create([
            'call_session_id' => $session->id,
            'log_level' => $level,
            'event_type' => $eventType,
            'message' => $message,
            'context' => $context,
            'source' => $source,
            'logged_at' => now(),
        ]);
    }

    public function scopeByLevel($query, string $level)
    {
        return $query->where('log_level', $level);
    }

    public function scopeByEventType($query, string $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    public function scopeBySource($query, string $source)
    {
        return $query->where('source', $source);
    }

    public function isError(): bool
    {
        return $this->log_level === 'error';
    }

    public function isWarning(): bool
    {
        return $this->log_level === 'warning';
    }
}
