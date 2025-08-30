<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialComment extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'provider',
        'provider_id',
        'post_id',
        'content',
        'author_id',
        'author_name',
        'metadata',
        'timestamp'
    ];

    protected $casts = [
        'metadata' => 'array',
        'timestamp' => 'datetime',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = Str::random(25);
            }
        });
    }
}
