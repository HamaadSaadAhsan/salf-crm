<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class LeadSource extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'identifier',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'active',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($leadSource) {
            if (empty($leadSource->slug)) {
                $leadSource->slug = Str::slug($leadSource->name);
            }

            if (empty($leadSource->identifier)) {
                $leadSource->identifier = strtoupper(Str::slug($leadSource->name, '_'));
            }
        });

        static::updating(function ($leadSource) {
            if ($leadSource->isDirty('name') && empty($leadSource->slug)) {
                $leadSource->slug = Str::slug($leadSource->name);
            }
        });
    }


    // Relationships
    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('name');
    }

    // Accessors
    public function getLeadsCountAttribute()
    {
        return $this->leads()->count();
    }

    public function getActiveLeadsCountAttribute()
    {
        return $this->leads()->where('inquiry_status', 'active')->count();
    }

    // Static methods
    public static function getActiveOptions()
    {
        return static::active()->ordered()->pluck('name', 'id');
    }

    public static function getPopularSources($limit = 5)
    {
        return static::active()
            ->withCount('leads')
            ->orderByDesc('leads_count')
            ->limit($limit)
            ->get();
    }

    // Methods
    public function activate()
    {
        return $this->update(['status' => 'active']);
    }

    public function deactivate()
    {
        return $this->update(['status' => 'inactive']);
    }

    public function isActive()
    {
        return $this->status === 'active';
    }

    public function isInactive()
    {
        return $this->status === 'inactive';
    }
}
