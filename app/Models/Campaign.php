<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Campaign extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'external_id',
        'name',
        'objective',
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

    public function adSets()
    {
        return $this->hasMany(AdSet::class, 'campaign_external_id', 'external_id');
    }
}
