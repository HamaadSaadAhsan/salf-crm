<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Office extends Model
{
    /** @use HasFactory<\Database\Factories\OfficeFactory> */
    use BelongsToOrganization, HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'zone_id',
        'name',
        'code',
        'address',
        'city',
        'country_code',
        'postal_code',
        'phone',
        'email',
        'is_active',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByZone($query, int $zoneId)
    {
        return $query->where('zone_id', $zoneId);
    }

    public function scopeByCountry($query, string $countryCode)
    {
        return $query->where('country_code', $countryCode);
    }
}
