<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AdSet extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'external_id',
        'name',
        'campaign_external_id',
        'status',
        'created_at',
        'last_synced'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'last_synced' => 'datetime',
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

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_external_id', 'external_id');
    }

    public function ads()
    {
        return $this->hasMany(Ad::class, 'ad_set_external_id', 'external_id');
    }
}
