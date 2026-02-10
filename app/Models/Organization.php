<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

class Organization extends Model
{
    /** @use HasFactory<\Database\Factories\OrganizationFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'logo',
        'settings',
        'owner_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
            'is_active' => 'boolean',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $organization) {
            if (empty($organization->slug)) {
                $organization->slug = Str::slug($organization->name);
            }
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['role', 'is_default', 'joined_at'])
            ->withTimestamps();
    }

    public function members(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'member');
    }

    public function admins(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'admin');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
