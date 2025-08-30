<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Integration extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'provider',
        'name',
        'config',
        'active'
    ];

    protected $casts = [
        'config' => 'array',
        'active' => 'boolean',
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
}
