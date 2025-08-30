<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'detail',
        'country_code',
        'country_name',
        'parent_id',
        'sort_order',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $attributes = [
        'status' => 'active',
        'sort_order' => 0,
    ];

    // Relationships
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Service::class, 'parent_id')->orderBy('sort_order');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    // Many-to-many relationship with users
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['assigned_at', 'status', 'notes'])
            ->withTimestamps();
    }

    // Active assigned users only
    public function activeUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('status', 'active');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeParents($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeChildren($query)
    {
        return $query->whereNotNull('parent_id');
    }

    public function scopeByCountry($query, $countryCode)
    {
        return $query->where('country_code', $countryCode);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    public function scopeWithActiveUsers($query)
    {
        return $query->with(['activeUsers']);
    }

    // Accessors & Mutators
    public function getFullHierarchyAttribute()
    {
        $hierarchy = collect([$this]);
        $current = $this;

        while ($current->parent) {
            $current = $current->parent;
            $hierarchy->prepend($current);
        }

        return $hierarchy->pluck('name')->implode(' > ');
    }

    public function getIsParentAttribute()
    {
        return $this->children()->exists();
    }

    public function getHasActiveUsersAttribute()
    {
        return $this->activeUsers()->exists();
    }

    public function getActiveUsersCountAttribute()
    {
        return $this->activeUsers()->count();
    }

    // Methods
    public function getAllDescendants()
    {
        $descendants = collect();

        foreach ($this->children as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->getAllDescendants());
        }

        return $descendants;
    }

    public function getAncestors()
    {
        $ancestors = collect();
        $current = $this->parent;

        while ($current) {
            $ancestors->prepend($current);
            $current = $current->parent;
        }

        return $ancestors;
    }

    public function getBreadcrumb()
    {
        return $this->getAncestors()->push($this);
    }

    // Service assignment methods
    public function assignToUser(User $user, array $attributes = [])
    {
        $pivotData = array_merge([
            'assigned_at' => now(),
            'status' => 'active'
        ], $attributes);

        return $this->users()->syncWithoutDetaching([$user->id => $pivotData]);
    }

    public function unassignFromUser(User $user)
    {
        return $this->users()->detach($user->id);
    }

    public function updateUserAssignment(User $user, array $attributes)
    {
        return $this->users()->updateExistingPivot($user->id, $attributes);
    }

    public function deactivateUserAssignment(User $user)
    {
        return $this->updateUserAssignment($user, ['status' => 'inactive']);
    }

    // Static methods
    public static function getHierarchyTree($parentId = null)
    {
        return static::active()
            ->where('parent_id', $parentId)
            ->ordered()
            ->with(['children' => function ($query) {
                $query->active()->ordered();
            }])
            ->get();
    }

    public static function getByCountryWithChildren($countryCode)
    {
        return static::active()
            ->byCountry($countryCode)
            ->with(['children' => function ($query) {
                $query->active()->ordered();
            }])
            ->ordered()
            ->get();
    }

    public static function getServicesWithUserCounts()
    {
        return static::active()
            ->withCount(['activeUsers'])
            ->ordered()
            ->get();
    }

    public function getCacheKey(string $suffix = ''): string
    {
        return "service:{$this->id}" . ($suffix ? ":{$suffix}" : '');
    }

    public static function getListCacheKey(array $params = []): string
    {
        return 'services:list:' . md5(serialize($params));
    }
}
