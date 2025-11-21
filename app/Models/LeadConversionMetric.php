<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadConversionMetric extends Model
{
    protected $fillable = [
        'metric_date',
        'dimension_type',
        'dimension_value',
        'service_id',
        'lead_source_id',
        'user_id',
        'total_leads',
        'new_leads',
        'contacted_leads',
        'qualified_leads',
        'converted_leads',
        'lost_leads',
        'conversion_rate',
        'qualification_rate',
        'revenue_generated',
        'average_deal_value',
        'period_type',
        'period_value',
    ];

    protected function casts(): array
    {
        return [
            'metric_date' => 'date',
            'conversion_rate' => 'decimal:2',
            'qualification_rate' => 'decimal:2',
            'revenue_generated' => 'decimal:2',
            'average_deal_value' => 'decimal:2',
        ];
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function leadSource(): BelongsTo
    {
        return $this->belongsTo(LeadSource::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
