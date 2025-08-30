<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FacebookWebhookConfig extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    protected $table = 'facebook_webhook_configs';

    protected $fillable = [
        'app_id',
        'page_id',
        'subscriptions',
        'active'
    ];

    protected $casts = [
        'subscriptions' => 'array',
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
