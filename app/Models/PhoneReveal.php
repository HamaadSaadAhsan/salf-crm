<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhoneReveal extends Model
{
    protected $fillable = ['user_id', 'lead_id', 'ip_address', 'user_agent', 'revealed_at', 'expires_at'];

    protected function casts(): array
    {
        return [
            'revealed_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }
}
