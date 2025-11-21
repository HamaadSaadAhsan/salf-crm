<?php

namespace App\Services;

use App\Models\Lead;
use Carbon\Carbon;

class BusinessPerformanceMetricsService
{
    public function calculateForPeriod(Carbon $date, string $periodType = 'day'): array
    {
        [$startDate, $endDate] = $this->getPeriodDates($date, $periodType);

        $totalLeads = Lead::whereBetween('created_at', [$startDate, $endDate])->count();
        $convertedLeads = Lead::where('inquiry_status', 'won')
            ->whereBetween('converted_at', [$startDate, $endDate])
            ->count();

        $conversionRate = $totalLeads > 0 ? ($convertedLeads / $totalLeads) * 100 : 0;

        // Calculate average lifecycle (created to converted)
        $avgLifecycle = Lead::where('inquiry_status', 'won')
            ->whereBetween('converted_at', [$startDate, $endDate])
            ->whereNotNull('converted_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (converted_at - created_at))/(24*3600)) as avg_days')
            ->value('avg_days');

        return [
            'period_type' => $periodType,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_leads' => $totalLeads,
            'converted_leads' => $convertedLeads,
            'conversion_rate' => round($conversionRate, 2),
            'average_lifecycle_days' => $avgLifecycle ? (int) round($avgLifecycle) : 0,
            'total_revenue' => 0, // TODO: Calculate from deal values
            'average_deal_value' => 0, // TODO: Calculate from deal values
        ];
    }

    protected function getPeriodDates(Carbon $date, string $periodType): array
    {
        return match ($periodType) {
            'day' => [$date->copy()->startOfDay(), $date->copy()->endOfDay()],
            'week' => [$date->copy()->startOfWeek(), $date->copy()->endOfWeek()],
            'month' => [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()],
            'year' => [$date->copy()->startOfYear(), $date->copy()->endOfYear()],
            default => [$date->copy()->startOfDay(), $date->copy()->endOfDay()],
        };
    }
}
