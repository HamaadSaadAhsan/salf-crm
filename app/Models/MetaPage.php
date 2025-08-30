<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class MetaPage extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'page_id',
        'access_token',
        'name',
        'last_updated'
    ];

    protected $hidden = [
        'access_token',
    ];

    protected $casts = [
        'last_updated' => 'datetime',
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

    public function leadForms()
    {
        return $this->hasMany(LeadForm::class, 'page_id', 'page_id');
    }
}
