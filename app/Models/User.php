<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'facebook_user_access_token',
        'facebook_token_expires_at',
        'facebook_refresh_token',
        'facebook_connected_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'facebook_user_access_token',
        'facebook_refresh_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'facebook_token_expires_at' => 'datetime',
            'facebook_connected_at' => 'datetime',
        ];
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'assigned_to');
    }

    // Many-to-many relationship with services
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class)
            ->withPivot(['assigned_at', 'status', 'notes', 'metadata'])
            ->withTimestamps();
    }

    // Active services only
    public function activeServices(): BelongsToMany
    {
        return $this->services()->wherePivot('status', 'active');
    }

    // Services by country
    public function servicesByCountry($countryCode): BelongsToMany
    {
        return $this->activeServices()->where('country_code', $countryCode);
    }

    // PostgreSQL specific: Services with specific metadata
    public function servicesWithMetadata($key, $value = null): BelongsToMany
    {
        $query = $this->services();

        if ($value === null) {
            // Check if key exists
            $query->whereRaw("service_user.metadata ? ?", [$key]);
        } else {
            // Check key-value pair
            $query->whereRaw("service_user.metadata ->> ? = ?", [$key, $value]);
        }

        return $query;
    }

    // PostgreSQL specific: Full-text search on notes
    public function servicesWithNotesContaining($searchTerm): BelongsToMany
    {
        return $this->services()
            ->whereRaw("to_tsvector('english', service_user.notes) @@ plainto_tsquery('english', ?)", [$searchTerm]);
    }

    // Service assignment with metadata
    public function assignToService(Service $service, array $attributes = [])
    {
        $pivotData = array_merge([
            'assigned_at' => now(),
            'status' => 'active'
        ], $attributes);

        // Handle metadata separately for JSONB
        if (isset($attributes['metadata']) && is_array($attributes['metadata'])) {
            $pivotData['metadata'] = json_encode($attributes['metadata']);
        }

        return $this->services()->syncWithoutDetaching([$service->id => $pivotData]);
    }

    // Update service assignment metadata
    public function updateServiceMetadata(Service $service, array $metadata)
    {
        return $this->services()->updateExistingPivot($service->id, [
            'metadata' => json_encode($metadata)
        ]);
    }

    // Add to existing metadata
    public function addServiceMetadata(Service $service, string $key, $value)
    {
        $pivot = $this->services()->where('service_id', $service->id)->first();

        if ($pivot) {
            $currentMetadata = json_decode($pivot->pivot->metadata ?? '{}', true);
            $currentMetadata[$key] = $value;

            return $this->updateServiceMetadata($service, $currentMetadata);
        }

        return false;
    }

    // Remove from metadata
    public function removeServiceMetadata(Service $service, string $key)
    {
        $pivot = $this->services()->where('service_id', $service->id)->first();

        if ($pivot) {
            $currentMetadata = json_decode($pivot->pivot->metadata ?? '{}', true);
            unset($currentMetadata[$key]);

            return $this->updateServiceMetadata($service, $currentMetadata);
        }

        return false;
    }

    // PostgreSQL specific scopes
    public function scopeWithServiceMetadata($query, $key, $value = null)
    {
        return $query->whereHas('services', function ($q) use ($key, $value) {
            if ($value === null) {
                $q->whereRaw("service_user.metadata ? ?", [$key]);
            } else {
                $q->whereRaw("service_user.metadata ->> ? = ?", [$key, $value]);
            }
        });
    }

    public function scopeWithServicesInRegion($query, array $countryCodes)
    {
        return $query->whereHas('activeServices', function ($q) use ($countryCodes) {
            $q->whereIn('country_code', $countryCodes);
        });
    }

    // PostgreSQL specific: Array aggregation for reporting
    public static function getServiceAssignmentReport()
    {
        return self::select([
            'users.id',
            'users.name',
            'users.email'
        ])
            ->selectRaw("
                array_agg(DISTINCT services.name) as service_names,
                array_agg(DISTINCT services.country_code) as countries,
                count(DISTINCT services.id) as total_services,
                count(DISTINCT CASE WHEN service_user.status = 'active' THEN services.id END) as active_services
            ")
            ->leftJoin('service_user', 'users.id', '=', 'service_user.user_id')
            ->leftJoin('services', 'service_user.service_id', '=', 'services.id')
            ->groupBy(['users.id', 'users.name', 'users.email'])
            ->having('count(DISTINCT services.id)', '>', 0)
            ->get();
    }

    // Accessors for JSONB
    public function getServiceMetadata(Service $service): array
    {
        $pivot = $this->services()->where('service_id', $service->id)->first();

        if ($pivot && $pivot->pivot->metadata) {
            return json_decode($pivot->pivot->metadata, true) ?? [];
        }

        return [];
    }

    public function getCacheKey(string $suffix = ''): string
    {
        return "user:{$this->id}" . ($suffix ? ":{$suffix}" : '');
    }

    public static function getListCacheKey(array $params = []): string
    {
        return 'users:list:' . md5(serialize($params));
    }

    public function metaPages(): HasMany
    {
        return $this->hasMany(MetaPage::class);
    }

    public function oauthSessions(): HasMany
    {
        return $this->hasMany(OAuthSession::class);
    }

    public function calendarIntegration(): HasOne
    {
        return $this->hasOne(CalendarIntegration::class);
    }

    public function scopeSuperAdmin()
    {
        return $this->hasRole('super-admin');
    }

    /**
     * Check if user has Facebook access token
     */
    public function hasFacebookToken(): bool
    {
        return !empty($this->facebook_user_access_token);
    }

    /**
     * Check if Facebook token is expired
     */
    public function isFacebookTokenExpired(): bool
    {
        if (!$this->facebook_token_expires_at) {
            return true;
        }

        return $this->facebook_token_expires_at->isPast();
    }

    /**
     * Get decrypted Facebook access token
     */
    public function getFacebookAccessToken(): ?string
    {
        if (!$this->facebook_user_access_token) {
            return null;
        }

        try {
            return decrypt($this->facebook_user_access_token);
        } catch (\Exception $e) {
            // Token might not be encrypted (legacy data)
            return $this->facebook_user_access_token;
        }
    }

    /**
     * Get decrypted Facebook refresh token
     */
    public function getFacebookRefreshToken(): ?string
    {
        if (!$this->facebook_refresh_token) {
            return null;
        }

        try {
            return decrypt($this->facebook_refresh_token);
        } catch (\Exception $e) {
            // Token might not be encrypted (legacy data)
            return $this->facebook_refresh_token;
        }
    }

    /**
     * Update Facebook tokens
     */
    public function updateFacebookTokens(string $accessToken, ?string $refreshToken = null, ?int $expiresIn = null): void
    {
        $this->update([
            'facebook_user_access_token' => encrypt($accessToken),
            'facebook_refresh_token' => $refreshToken ? encrypt($refreshToken) : $this->facebook_refresh_token,
            'facebook_token_expires_at' => $expiresIn ? now()->addSeconds($expiresIn) : now()->addDays(60),
            'facebook_connected_at' => $this->facebook_connected_at ?? now(),
        ]);
    }

    /**
     * Revoke Facebook tokens
     */
    public function revokeFacebookTokens(): void
    {
        $this->update([
            'facebook_user_access_token' => null,
            'facebook_refresh_token' => null,
            'facebook_token_expires_at' => null,
            'facebook_connected_at' => null,
        ]);
    }

    /**
     * Get Facebook token status
     */
    public function getFacebookTokenStatus(): array
    {
        return [
            'has_token' => $this->hasFacebookToken(),
            'is_expired' => $this->isFacebookTokenExpired(),
            'expires_at' => $this->facebook_token_expires_at,
            'connected_at' => $this->facebook_connected_at,
            'has_refresh_token' => !empty($this->facebook_refresh_token),
            'expires_in_hours' => $this->facebook_token_expires_at ?
                now()->diffInHours($this->facebook_token_expires_at, false) : null,
        ];
    }

    public function facebookIntegration()
    {
        return $this->hasOne(Integration::class)->where('provider', 'facebook');
    }

    // Scopes

    /**
     * Scope to get users with Facebook tokens
     */
    public function scopeWithFacebookToken($query)
    {
        return $query->whereNotNull('facebook_user_access_token');
    }

    /**
     * Scope to get users with expired Facebook tokens
     */
    public function scopeWithExpiredFacebookToken($query)
    {
        return $query->whereNotNull('facebook_user_access_token')
            ->where('facebook_token_expires_at', '<', now());
    }

    /**
     * Scope to get users with tokens expiring soon
     */
    public function scopeWithFacebookTokenExpiringSoon($query, int $hours = 24)
    {
        return $query->whereNotNull('facebook_user_access_token')
            ->where('facebook_token_expires_at', '>', now())
            ->where('facebook_token_expires_at', '<', now()->addHours($hours));
    }
}
