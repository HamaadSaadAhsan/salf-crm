<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class LeadForm extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'external_id',
        'name',
        'page_id',
        'status',
        'questions',
        'created_at',
        'last_synced'
    ];

    protected $casts = [
        'questions' => 'array',
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

    public function page(): BelongsTo
    {
        return $this->belongsTo(MetaPage::class, 'page_id', 'page_id');
    }

    public function leads()
    {
        return $this->hasMany(Lead::class);
    }
}
