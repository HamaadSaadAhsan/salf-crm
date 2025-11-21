<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserPerformanceSnapshot extends Model
{
    protected $fillable = [
        'user_id',
        'snapshot_date',
        'role',
        'assigned_leads',
        'current_active_leads',
        'qualified_leads',
        'converted_leads',
        'conversion_rate',
        'qualification_rate',
        'total_tasks',
        'completed_tasks',
        'overdue_tasks',
        'task_completion_accuracy',
        'avg_first_response_time',
        'avg_qualification_time',
        'avg_conversion_time',
        'total_activities',
        'calls_made',
        'emails_sent',
        'meetings_held',
        'performance_weight',
        'revenue_generated',
    ];

    protected function casts(): array
    {
        return [
            'snapshot_date' => 'date',
            'conversion_rate' => 'decimal:2',
            'qualification_rate' => 'decimal:2',
            'task_completion_accuracy' => 'decimal:2',
            'performance_weight' => 'decimal:2',
            'revenue_generated' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
