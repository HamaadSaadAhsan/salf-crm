<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyMetric extends Model
{
    protected $fillable = [
        'metric_date',
        'total_leads',
        'new_leads_today',
        'qualified_leads',
        'converted_leads',
        'overall_conversion_rate',
        'lead_conversion_score',
        'total_revenue',
        'average_deal_value',
        'average_lifecycle_days',
        'active_users',
        'total_registered_users',
        'system_adoption_rate',
        'total_tasks',
        'completed_tasks',
        'overdue_tasks',
        'task_completion_rate',
        'avg_first_response_time',
        'avg_qualification_time',
        'avg_conversion_time',
    ];

    protected function casts(): array
    {
        return [
            'metric_date' => 'date',
            'overall_conversion_rate' => 'decimal:2',
            'lead_conversion_score' => 'decimal:2',
            'total_revenue' => 'decimal:2',
            'average_deal_value' => 'decimal:2',
            'system_adoption_rate' => 'decimal:2',
            'task_completion_rate' => 'decimal:2',
        ];
    }
}
