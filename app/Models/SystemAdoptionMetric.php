<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemAdoptionMetric extends Model
{
    protected $fillable = [
        'metric_date',
        'total_users',
        'active_users',
        'very_active_users',
        'inactive_users',
        'adoption_rate',
        'engagement_rate',
        'users_by_role',
        'active_users_by_role',
        'total_logins',
        'total_activities_created',
        'total_leads_created',
        'total_tasks_created',
        'avg_activities_per_user',
        'avg_logins_per_user',
        'feature_usage',
    ];

    protected function casts(): array
    {
        return [
            'metric_date' => 'date',
            'adoption_rate' => 'decimal:2',
            'engagement_rate' => 'decimal:2',
            'avg_activities_per_user' => 'decimal:2',
            'avg_logins_per_user' => 'decimal:2',
            'users_by_role' => 'array',
            'active_users_by_role' => 'array',
            'feature_usage' => 'array',
        ];
    }
}
