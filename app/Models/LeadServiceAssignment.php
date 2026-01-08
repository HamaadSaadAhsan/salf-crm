<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadServiceAssignment extends Model
{
    protected $fillable = [
        'lead_id',
        'service_id',
        'user_id',
        'parent_service_id',
        'is_parent_service',
        'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'is_parent_service' => 'boolean',
            'assigned_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parentService(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'parent_service_id');
    }

    /**
     * Get count of assignments for a user by service
     */
    public static function getCountByUserAndService(int $userId, int $serviceId): int
    {
        return static::where('user_id', $userId)
            ->where('service_id', $serviceId)
            ->count();
    }

    /**
     * Get count of child service assignments for a user under a parent service
     */
    public static function getChildServiceCountsByUser(int $userId, int $parentServiceId): array
    {
        return static::where('user_id', $userId)
            ->where('parent_service_id', $parentServiceId)
            ->join('services', 'lead_service_assignments.service_id', '=', 'services.id')
            ->selectRaw('services.name, services.id, count(*) as count')
            ->groupBy('services.id', 'services.name')
            ->pluck('count', 'name')
            ->toArray();
    }
}
