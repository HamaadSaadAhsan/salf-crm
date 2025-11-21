<?php

namespace App\Services;

use App\Models\DepartmentHandoffMetric;
use App\Models\Lead;
use Carbon\Carbon;

class DepartmentHandoffMetricsService
{
    public function calculate(Carbon $date): void
    {
        // Marketing to CRO handoff
        $this->calculateHandoff($date, 'marketing', 'cro', function ($query) {
            return $query->whereNotNull('first_cro_contact_at')
                ->selectRaw('EXTRACT(EPOCH FROM (first_cro_contact_at - created_at))/60 as handoff_time');
        });

        // CRO to Advisor handoff (qualification to advisor contact)
        $this->calculateHandoff($date, 'cro', 'advisor', function ($query) {
            return $query->whereNotNull('advisor_first_contact_at')
                ->whereNotNull('qualification_response_at')
                ->selectRaw('EXTRACT(EPOCH FROM (advisor_first_contact_at - qualification_response_at))/60 as handoff_time');
        });

        // Advisor to Processing (future implementation - when lead is won)
        // This can be added when processing department is implemented
    }

    protected function calculateHandoff(Carbon $date, string $fromDept, string $toDept, callable $queryBuilder): void
    {
        $query = Lead::query()->whereDate('created_at', '<=', $date);
        $query = $queryBuilder($query);

        $handoffTimes = $query->get()->pluck('handoff_time')->filter()->values();

        if ($handoffTimes->isEmpty()) {
            return;
        }

        $avgTime = $handoffTimes->avg();
        $minTime = $handoffTimes->min();
        $maxTime = $handoffTimes->max();
        $medianTime = $handoffTimes->median();

        $totalHandoffs = $handoffTimes->count();
        $under1Hour = $handoffTimes->filter(fn ($time) => $time <= 60)->count();
        $under24Hours = $handoffTimes->filter(fn ($time) => $time <= 1440)->count();
        $over24Hours = $handoffTimes->filter(fn ($time) => $time > 1440)->count();

        $successRate = $totalHandoffs > 0 ? ($under24Hours / $totalHandoffs) * 100 : 0;

        DepartmentHandoffMetric::updateOrCreate(
            [
                'metric_date' => $date->toDateString(),
                'from_department' => $fromDept,
                'to_department' => $toDept,
                'user_id' => null, // Aggregate for all users
            ],
            [
                'avg_handoff_time' => (int) round($avgTime),
                'min_handoff_time' => (int) round($minTime),
                'max_handoff_time' => (int) round($maxTime),
                'median_handoff_time' => (int) round($medianTime),
                'total_handoffs' => $totalHandoffs,
                'handoffs_under_1hour' => $under1Hour,
                'handoffs_under_24hours' => $under24Hours,
                'handoffs_over_24hours' => $over24Hours,
                'success_rate' => round($successRate, 2),
                'returned_leads' => 0, // TODO: Calculate returned/requalified leads
            ]
        );
    }
}
