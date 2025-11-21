<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DepartmentHandoffMetric extends Model
{
    protected $fillable = [
        'metric_date',
        'from_department',
        'to_department',
        'avg_handoff_time',
        'min_handoff_time',
        'max_handoff_time',
        'median_handoff_time',
        'total_handoffs',
        'handoffs_under_1hour',
        'handoffs_under_24hours',
        'handoffs_over_24hours',
        'success_rate',
        'returned_leads',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'metric_date' => 'date',
            'success_rate' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
