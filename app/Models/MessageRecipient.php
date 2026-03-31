<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MessageRecipient extends Model
{
    protected $fillable = [
        'message_id',
        'user_id',
        'type',
        'is_read',
        'is_starred',
        'read_at',
        'trashed_at',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
            'is_starred' => 'boolean',
            'read_at' => 'datetime',
            'trashed_at' => 'datetime',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(Message::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
