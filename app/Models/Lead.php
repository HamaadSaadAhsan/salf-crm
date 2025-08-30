<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Lead extends Model
{
    use HasFactory, HasUuids, SoftDeletes, Searchable;

    protected $fillable = [
        'name', 'email', 'phone', 'occupation', 'address', 'country', 'city',
        'latitude', 'longitude', 'service_id', 'lead_source_id', 'detail', 'budget',
        'custom_fields', 'inquiry_status', 'priority', 'inquiry_type',
        'inquiry_country', 'assigned_to', 'assigned_date', 'ticket_id',
        'ticket_date', 'import_id', 'external_id', 'lead_score',
        'last_activity_at', 'next_follow_up_at', 'tags',
        'form_external_id', 'lead_form_id', 'ad_external_id'
    ];

    protected $attributes = [
        'inquiry_status' => 'new',
        'priority' => 'medium',
        'lead_score' => 0,
        'pending_activities_count' => 0,
        'tags' => '[]',
        'custom_fields' => '{}',
    ];

    protected $casts = [
        'budget' => 'array',
        'custom_fields' => 'array',
        'tags' => 'array',
        'assigned_date' => 'datetime',
        'ticket_date' => 'datetime',
        'last_activity_at' => 'datetime',
        'next_follow_up_at' => 'datetime',
        'lead_score' => 'integer',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    protected $hidden = [
        'external_id',
        'import_id',
    ];

    protected $appends = [
        'formatted_budget',
        'days_since_created',
        'is_hot_lead',
    ];

    // Boot method for auto-updating lead score and activity
    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($lead) {
            $lead->created_by ??= auth()->id();
            $lead->lead_score ??= static::calculateInitialScore($lead);
            $lead->last_activity_at = now();
        });

        static::updating(function ($lead) {
            if ($lead->isDirty(['inquiry_status', 'priority', 'assigned_to'])) {
                $lead->last_activity_at = now();
            }
        });
    }
    /**
     * Get the indexable data array for the model.
     */
    public function toSearchableArray(): array
    {
        $array = [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'occupation' => $this->occupation,
            'address' => $this->address,
            'city' => $this->city,
            'country' => $this->country,
            'detail' => $this->detail,
            'inquiry_status' => $this->inquiry_status,
            'priority' => $this->priority,
            'inquiry_type' => $this->inquiry_type,
            'inquiry_country' => $this->inquiry_country,
            'lead_score' => $this->lead_score,
            'service_id' => $this->service_id,
            'lead_source_id' => $this->lead_source_id,
            'assigned_to' => $this->assigned_to,
            'created_by' => $this->created_by,
            'ticket_id' => $this->ticket_id,
            // Budget handling
            'budget_amount' => $this->budget['amount'] ?? null,
            'budget_currency' => $this->budget['currency'] ?? null,
            'formatted_budget' => $this->formatted_budget,
            // Location data
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'tags' => collect($this->tags ?? [])->pluck('label')->implode(', '),
            'tag_values' => collect($this->tags ?? [])->pluck('value')->toArray(),
            // Custom fields as searchable text
            'custom_fields_text' => $this->custom_fields ?
                implode(' ', array_values(array_filter($this->custom_fields, 'is_string'))) : null,
            // Relationship data
            'service_name' => $this->service?->name,
            'source_name' => $this->source?->name,
            'assigned_user_name' => $this->assignedTo?->name,
            'assigned_user_email' => $this->assignedTo?->email,
            'created_by_name' => $this->createdBy?->name,
            // Timestamps for filtering and sorting
            'created_at_timestamp' => $this->created_at?->timestamp,
            'updated_at_timestamp' => $this->updated_at?->timestamp,
            'last_activity_at_timestamp' => $this->last_activity_at?->timestamp,
            'next_follow_up_at_timestamp' => $this->next_follow_up_at?->timestamp,
            'assigned_date_timestamp' => $this->assigned_date?->timestamp,
            // Computed fields
            'days_since_created' => $this->days_since_created,
            'is_hot_lead' => $this->is_hot_lead,
            'is_assigned' => !is_null($this->assigned_to),
            'is_overdue' => $this->next_follow_up_at && $this->next_follow_up_at->isPast(),
            'days_in_current_status' => $this->updated_at->diffInDays(now()),
        ];

        return array_filter($array, function ($value) {
            return !is_null($value);
        });
    }

    /**
     * Configure Meilisearch index settings
     */
    public function searchableSettings(): array
    {
        return [
            'searchableAttributes' => [
                'name',
                'email',
                'phone',
                'occupation',
                'address',
                'city',
                'country',
                'detail',
                'ticket_id',
                'custom_fields_text',
                'service_name',
                'source_name',
                'assigned_user_name',
                'assigned_user_email',
                'created_by_name'
            ],
            'filterableAttributes' => [
                'inquiry_status',
                'priority',
                'inquiry_type',
                'lead_score',
                'service_id',
                'lead_source_id',
                'assigned_to',
                'created_by',
                'city',
                'country',
                'inquiry_country',
                'budget_currency',
                'budget_amount',
                'is_hot_lead',
                'is_assigned',
                'is_overdue',
                'created_at_timestamp',
                'updated_at_timestamp',
                'last_activity_at_timestamp',
                'next_follow_up_at_timestamp',
                'assigned_date_timestamp',
                'days_since_created',
                'days_in_current_status'
            ],
            'sortableAttributes' => [
                'name',
                'email',
                'lead_score',
                'inquiry_status',
                'priority',
                'budget_amount',
                'created_at_timestamp',
                'updated_at_timestamp',
                'last_activity_at_timestamp',
                'next_follow_up_at_timestamp',
                'assigned_date_timestamp',
                'days_since_created',
                'days_in_current_status'
            ],
            'rankingRules' => [
                'words',
                'typo',
                'proximity',
                'attribute',
                'sort',
                'exactness',
                'lead_score:desc', // Prioritize higher scoring leads
                'is_hot_lead:desc' // Then hot leads
            ],
            'distinctAttribute' => 'id',
            'typoTolerance' => [
                'enabled' => true,
                'minWordSizeForTypos' => [
                    'oneTypo' => 4,
                    'twoTypos' => 8
                ]
            ]
        ];
    }

    /**
     * Define the index name for Meilisearch
     */
    public function searchableAs(): string
    {
        return 'leads_index';
    }

    // Accessor to ensure tags always returns an array
    public function getTagsAttribute($value)
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($value) ? $value : [];
    }

    // Mutator to ensure tags are properly stored
    public function setTagsAttribute($value)
    {
        if (is_array($value)) {
            // Ensure we're storing array values, not object keys
            $this->attributes['tags'] = json_encode(array_values($value));
        } else {
            $this->attributes['tags'] = json_encode([]);
        }
    }

    // Helper method to check if lead has a specific tag
    public function hasTag(string $tagValue): bool
    {
        return collect($this->tags)->pluck('value')->contains($tagValue);
    }

    // Helper method to add a tag
    public function addTag(array $tag): void
    {
        $tags = $this->tags;

        // Check if tag already exists
        if (!collect($tags)->pluck('value')->contains($tag['value'])) {
            $tags[] = $tag;
            $this->tags = $tags;
        }
    }

    // Helper method to remove a tag
    public function removeTag(string $tagValue): void
    {
        $tags = $this->tags;
        $this->tags = collect($tags)->reject(function ($tag) use ($tagValue) {
            return $tag['value'] === $tagValue;
        })->values()->toArray();
    }

    // Scope to filter by tags
    public function scopeWithTag($query, string $tagValue)
    {
        return $query->whereJsonContains('tags', ['value' => $tagValue]);
    }

    // Scope to filter by any of the given tags
    public function scopeWithAnyTags($query, array $tagValues)
    {
        return $query->where(function ($q) use ($tagValues) {
            foreach ($tagValues as $tagValue) {
                $q->orWhereJsonContains('tags', ['value' => $tagValue]);
            }
        });
    }

    /**
     * Determine if the model should be searchable.
     */
    public function shouldBeSearchable(): bool
    {
        // Only index non-deleted leads and exclude spam
        return !$this->trashed() && $this->inquiry_status !== 'spam';
    }

    // Relationships (keeping your existing relationships)
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function source(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class, 'lead_source_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(LeadNote::class);
    }

    public function calls()
    {
        return $this->activities()->where('type', 'call');
    }

    public function meetings()
    {
        return $this->activities()->where('type', 'meeting');
    }

    public function pendingActivities()
    {
        return $this->activities()->where('status', 'pending');
    }

    public function completedActivities()
    {
        return $this->activities()->where('status', 'completed');
    }

    // Accessors (keeping your existing accessors)
    protected function formattedBudget(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->budget ?
                ($this->budget['currency'] ?? 'USD') . ' ' . number_format($this->budget['amount'] ?? 0) :
                null
        );
    }

    protected function daysSinceCreated(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->created_at->diffInDays(now())
        );
    }

    protected function isHotLead(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->lead_score >= 80 ||
                ($this->priority === 'high' && in_array($this->inquiry_status, ['new', 'contacted']))
        );
    }

    // Scopes (keeping your existing scopes)
    public function scopeActive(Builder $query): void
    {
        $query->whereNotIn('inquiry_status', ['won', 'lost']);
    }

    public function scopeHotLeads(Builder $query): void
    {
        $query->where('lead_score', '>=', 80)
            ->orWhere(function ($q) {
                $q->where('priority', 'high')
                    ->whereIn('inquiry_status', ['new', 'contacted']);
            });
    }

    public function scopeAssignedTo(Builder $query, $userId): void
    {
        $query->where('assigned_to', $userId);
    }

    public function scopeByStatus(Builder $query, string $status): void
    {
        $query->where('inquiry_status', $status);
    }

    public function scopeBySource(Builder $query, $sourceId): void
    {
        $query->where('lead_source_id', $sourceId);
    }

    public function scopeCreatedBetween(Builder $query, $start, $end): void
    {
        $query->whereBetween('created_at', [$start, $end]);
    }

    public function scopeNearLocation(Builder $query, $lat, $lng, $radius = 50): void
    {
        $query->whereRaw(
            "ST_DWithin(ST_MakePoint(longitude, latitude)::geography, ST_MakePoint(?, ?)::geography, ? * 1000)",
            [$lng, $lat, $radius]
        );
    }

    public function scopeFullTextSearch(Builder $query, string $term): void
    {
        // Check if the search term looks like a phone number
        $isPhoneSearch = preg_match('/^[\d\+\-\s\(\)]+$/', $term);

        if ($isPhoneSearch) {
            // For phone searches, use LIKE with cleaned numbers
            $cleanTerm = preg_replace('/[^\d]/', '', $term);
            $query->whereRaw("regexp_replace(phone, '[^\d]', '', 'g') LIKE ?", ['%' . $cleanTerm . '%']);
        } else {
            // For text searches, use full-text search
            $query->whereRaw(
                "to_tsvector('english', coalesce(name,'') || ' ' || coalesce(email,'') || ' ' || coalesce(detail,'')) @@ plainto_tsquery('english', ?)",
                [$term]
            );
        }
    }

    // Helper methods (keeping your existing methods)
    public static function calculateInitialScore(self $lead): int
    {
        $score = 50; // Base score

        // Email domain scoring
        if ($lead->email && !str_contains($lead->email, 'gmail.com')) {
            $score += 10; // Business email
        }

        // Phone number presence
        if ($lead->phone) {
            $score += 15;
        }

        // Occupation scoring
        if ($lead->occupation && in_array(strtolower($lead->occupation), ['ceo', 'cto', 'manager', 'director'])) {
            $score += 20;
        }

        // Source scoring
        if ($lead->lead_source_id) {
            $score += 5;
        }

        // Budget presence
        if ($lead->budget && isset($lead->budget['amount']) && $lead->budget['amount'] > 0) {
            $score += 10;
        }

        return min(100, $score);
    }

    public function updateScore(): void
    {
        $score = static::calculateInitialScore($this);

        // Add activity-based scoring
        $recentActivities = $this->activities()
            ->where('created_at', '>=', now()->subDays(7))
            ->count();

        $score += min(20, $recentActivities * 5);

        $this->update(['lead_score' => min(100, $score)]);
    }

    // Keep all your existing attribute getters and methods
    public function getFullNameAttribute()
    {
        return $this->name;
    }

    public function getIsAssignedAttribute()
    {
        return !is_null($this->assigned_to);
    }

    public function getIsHotAttribute()
    {
        return $this->lead_score >= 70;
    }

    public function getIsOverdueAttribute()
    {
        return $this->next_follow_up_at && $this->next_follow_up_at->isPast();
    }

    public function getStatusColorAttribute()
    {
        return match ($this->inquiry_status) {
            'new' => 'blue',
            'contacted' => 'yellow',
            'qualified' => 'green',
            'proposal' => 'purple',
            'won' => 'emerald',
            'lost' => 'red',
            'nurturing' => 'gray',
            default => 'gray'
        };
    }

    public function getPriorityColorAttribute()
    {
        return match ($this->priority) {
            'low' => 'gray',
            'medium' => 'blue',
            'high' => 'orange',
            'urgent' => 'red',
            default => 'gray'
        };
    }

    public function getDaysInCurrentStatusAttribute()
    {
        return $this->updated_at->diffInDays(now());
    }

    // Mutators
    public function setEmailAttribute($value)
    {
        $this->attributes['email'] = strtolower(trim($value));
    }

    public function setPhoneAttribute($value)
    {
        $this->attributes['phone'] = preg_replace('/[^0-9+\-\s()]/', '', $value);
    }

    // Methods (keeping your existing methods)
    public function assignTo(User $user)
    {
        $this->update([
            'assigned_to' => $user->id,
            'assigned_date' => now(),
        ]);

        return $this;
    }

    public function unassign()
    {
        $this->update([
            'assigned_to' => null,
            'assigned_date' => null,
        ]);

        return $this;
    }

    public function changeStatus($status)
    {
        $this->update(['inquiry_status' => $status]);
        $this->touch('last_activity_at');
        return $this;
    }

    public function scheduleFollowUp(Carbon $dateTime)
    {
        $this->update(['next_follow_up_at' => $dateTime]);
        return $this;
    }

    public function markAsContacted()
    {
        return $this->changeStatus('contacted');
    }

    public function markAsQualified()
    {
        return $this->changeStatus('qualified');
    }

    public function markAsWon()
    {
        return $this->changeStatus('won');
    }

    public function markAsLost()
    {
        return $this->changeStatus('lost');
    }

    // Static methods (keeping your existing static methods)
    public static function getStatusOptions()
    {
        return [
            'new' => 'New',
            'contacted' => 'Contacted',
            'qualified' => 'Qualified',
            'proposal' => 'Proposal Sent',
            'won' => 'Won',
            'lost' => 'Lost',
            'nurturing' => 'Nurturing',
        ];
    }

    public static function getPriorityOptions()
    {
        return [
            'low' => 'Low',
            'medium' => 'Medium',
            'high' => 'High',
            'urgent' => 'Urgent',
        ];
    }

    public static function getInquiryTypeOptions()
    {
        return [
            'phone' => 'Phone',
            'email' => 'Email',
            'web' => 'Website',
            'referral' => 'Referral',
            'social' => 'Social Media',
            'advertisement' => 'Advertisement',
        ];
    }

    public static function getHotLeads($limit = 10)
    {
        return static::hotLeads()
            ->with(['service', 'source', 'assignedTo'])
            ->orderByDesc('lead_score')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    public static function getOverdueFollowUps($limit = 10)
    {
        return static::where('next_follow_up_at', '<', now())
            ->whereNotNull('next_follow_up_at')
            ->with(['service', 'source', 'assignedTo'])
            ->orderBy('next_follow_up_at')
            ->limit($limit)
            ->get();
    }

    // Cache keys
    public function getCacheKey(string $suffix = ''): string
    {
        return "lead:{$this->id}" . ($suffix ? ":{$suffix}" : '');
    }

    public static function getListCacheKey(array $params = []): string
    {
        return 'leads:list:' . md5(serialize($params));
    }

    public function ad(): BelongsTo
    {
        return $this->belongsTo(Ad::class, 'ad_external_id', 'external_id');
    }

    public function leadForm(): BelongsTo
    {
        return $this->belongsTo(LeadForm::class);
    }
}
