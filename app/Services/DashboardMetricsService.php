<?php

namespace App\Services;

use App\Models\DailyMetric;
use App\Models\Lead;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DashboardMetricsService
{
    public function __construct(
        protected LeadConversionMetricsService $leadConversionService,
        protected UserPerformanceMetricsService $userPerformanceService,
        protected DepartmentHandoffMetricsService $departmentHandoffService,
        protected SystemAdoptionMetricsService $systemAdoptionService,
        protected BusinessPerformanceMetricsService $businessPerformanceService,
    ) {}

    public function calculateDailyMetrics(Carbon $date): void
    {
        Log::info("Starting daily metrics calculation for {$date->toDateString()}");

        try {
            // Calculate individual metrics
            $this->leadConversionService->calculate($date);
            $this->userPerformanceService->calculate($date);
            $this->departmentHandoffService->calculate($date);
            $systemAdoptionMetric = $this->systemAdoptionService->calculate($date);

            // Calculate aggregated daily metrics
            $this->calculateDailyMetricsSummary($date, $systemAdoptionMetric);

            Log::info("Daily metrics calculation completed successfully for {$date->toDateString()}");
        } catch (\Exception $e) {
            Log::error("Daily metrics calculation failed for {$date->toDateString()}: ".$e->getMessage());
            throw $e;
        }
    }

    protected function calculateDailyMetricsSummary(Carbon $date, $systemAdoptionMetric): void
    {
        // Lead Metrics
        $totalLeads = Lead::whereDate('created_at', '<=', $date)->count();
        $newLeadsToday = Lead::whereDate('created_at', $date)->count();
        $qualifiedLeads = Lead::whereNotNull('qualified_at')
            ->whereDate('qualified_at', '<=', $date)
            ->count();
        $convertedLeads = Lead::where('inquiry_status', 'won')
            ->whereDate('converted_at', '<=', $date)
            ->count();

        $overallConversionRate = $totalLeads > 0 ? ($convertedLeads / $totalLeads) * 100 : 0;
        $leadConversionScore = $this->calculateLeadConversionScore($date);

        // Business Performance
        $avgLifecycleDays = Lead::where('inquiry_status', 'won')
            ->whereNotNull('converted_at')
            ->whereDate('converted_at', '<=', $date)
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (converted_at - created_at))/(24*3600)) as avg_days')
            ->value('avg_days');

        // Task Metrics
        $totalTasks = Task::whereDate('created_at', '<=', $date)->count();
        $completedTasks = Task::where('status', 'completed')
            ->whereDate('updated_at', '<=', $date)
            ->count();
        $overdueTasks = Task::where('status', '!=', 'completed')
            ->where('due_at', '<', $date)
            ->count();

        $taskCompletionRate = $totalTasks > 0 ? ($completedTasks / $totalTasks) * 100 : 0;

        // Response Times (in minutes)
        $avgFirstResponseTime = Lead::whereNotNull('first_cro_contact_at')
            ->whereDate('created_at', '<=', $date)
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (first_cro_contact_at - created_at))/60) as avg_time')
            ->value('avg_time');

        $avgQualificationTime = Lead::whereNotNull('qualification_response_at')
            ->whereNotNull('first_cro_contact_at')
            ->whereDate('qualified_at', '<=', $date)
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (qualification_response_at - first_cro_contact_at))/60) as avg_time')
            ->value('avg_time');

        $avgConversionTime = Lead::where('inquiry_status', 'won')
            ->whereNotNull('converted_at')
            ->whereDate('converted_at', '<=', $date)
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (converted_at - created_at))/60) as avg_time')
            ->value('avg_time');

        DailyMetric::updateOrCreate(
            ['metric_date' => $date->toDateString()],
            [
                'total_leads' => $totalLeads,
                'new_leads_today' => $newLeadsToday,
                'qualified_leads' => $qualifiedLeads,
                'converted_leads' => $convertedLeads,
                'overall_conversion_rate' => round($overallConversionRate, 2),
                'lead_conversion_score' => round($leadConversionScore, 2),
                'total_revenue' => 0, // TODO: Calculate from deal values
                'average_deal_value' => 0, // TODO: Calculate from deal values
                'average_lifecycle_days' => $avgLifecycleDays ? (int) round($avgLifecycleDays) : 0,
                'active_users' => $systemAdoptionMetric->active_users,
                'total_registered_users' => $systemAdoptionMetric->total_users,
                'system_adoption_rate' => $systemAdoptionMetric->adoption_rate,
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'overdue_tasks' => $overdueTasks,
                'task_completion_rate' => round($taskCompletionRate, 2),
                'avg_first_response_time' => $avgFirstResponseTime ? (int) round($avgFirstResponseTime) : null,
                'avg_qualification_time' => $avgQualificationTime ? (int) round($avgQualificationTime) : null,
                'avg_conversion_time' => $avgConversionTime ? (int) round($avgConversionTime) : null,
            ]
        );
    }

    protected function calculateLeadConversionScore(Carbon $date): float
    {
        // Enhanced Lead Conversion Score = weighted average of multiple factors
        // Factors: conversion rate, qualification rate, contact rate, source quality,
        //          response time, engagement level, average lead score

        $totalLeads = Lead::whereDate('created_at', '<=', $date)->count();

        if ($totalLeads === 0) {
            return 0;
        }

        // 1. Core Conversion Metrics (50% weight total)
        $convertedLeads = Lead::where('inquiry_status', 'won')->whereDate('converted_at', '<=', $date)->count();
        $qualifiedLeads = Lead::whereNotNull('qualified_at')->whereDate('qualified_at', '<=', $date)->count();
        $contactedLeads = Lead::whereNotNull('first_cro_contact_at')->whereDate('first_cro_contact_at', '<=', $date)->count();

        $conversionRate = ($convertedLeads / $totalLeads) * 100;
        $qualificationRate = ($qualifiedLeads / $totalLeads) * 100;
        $contactRate = ($contactedLeads / $totalLeads) * 100;

        $coreMetricsScore = ($conversionRate * 0.6) + ($qualificationRate * 0.25) + ($contactRate * 0.15);

        // 2. Source Quality Score (15% weight)
        $sourceQualityScore = $this->calculateSourceQualityScore($date);

        // 3. Response Time Score (15% weight) - faster response = higher score
        $responseTimeScore = $this->calculateResponseTimeScore($date);

        // 4. Engagement Score (10% weight) - more activities = higher engagement
        $engagementScore = $this->calculateEngagementScore($date);

        // 5. Average Lead Score (10% weight) - system-calculated lead quality
        $avgLeadScore = Lead::whereDate('created_at', '<=', $date)->avg('lead_score') ?? 0;

        // Weighted final score
        $finalScore = ($coreMetricsScore * 0.50) +
                      ($sourceQualityScore * 0.15) +
                      ($responseTimeScore * 0.15) +
                      ($engagementScore * 0.10) +
                      ($avgLeadScore * 0.10);

        return min(100, round($finalScore, 2)); // Cap at 100
    }

    protected function calculateSourceQualityScore(Carbon $date): float
    {
        // Calculate quality score based on conversion rates by source
        $sources = Lead::selectRaw('lead_source_id, COUNT(*) as total,
                                     SUM(CASE WHEN inquiry_status = \'won\' THEN 1 ELSE 0 END) as converted')
            ->whereDate('created_at', '<=', $date)
            ->whereNotNull('lead_source_id')
            ->groupBy('lead_source_id')
            ->get();

        if ($sources->isEmpty()) {
            return 50; // Neutral score if no data
        }

        $weightedScore = 0;
        $totalLeadsFromSources = 0;

        foreach ($sources as $source) {
            $conversionRate = $source->total > 0 ? ($source->converted / $source->total) * 100 : 0;
            $weightedScore += $conversionRate * $source->total;
            $totalLeadsFromSources += $source->total;
        }

        return $totalLeadsFromSources > 0 ? $weightedScore / $totalLeadsFromSources : 50;
    }

    protected function calculateResponseTimeScore(Carbon $date): float
    {
        // Score based on average first response time (lower is better)
        // Target: < 30 minutes = 100, 30-60 min = 80, 60-120 min = 60, > 120 min = 40
        $avgResponseTime = Lead::whereNotNull('first_cro_contact_at')
            ->whereDate('created_at', '<=', $date)
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (first_cro_contact_at - created_at))/60) as avg_minutes')
            ->value('avg_minutes');

        if (! $avgResponseTime) {
            return 50; // Neutral score if no data
        }

        if ($avgResponseTime <= 30) {
            return 100;
        } elseif ($avgResponseTime <= 60) {
            return 80;
        } elseif ($avgResponseTime <= 120) {
            return 60;
        } elseif ($avgResponseTime <= 240) {
            return 40;
        } else {
            return 20;
        }
    }

    protected function calculateEngagementScore(Carbon $date): float
    {
        // Score based on average activities per lead
        // More activities = better engagement
        $totalLeads = Lead::whereDate('created_at', '<=', $date)->count();

        if ($totalLeads === 0) {
            return 0;
        }

        $totalActivities = \App\Models\LeadActivity::whereDate('created_at', '<=', $date)->count();
        $avgActivitiesPerLead = $totalActivities / $totalLeads;

        // Target: > 5 activities = 100, 3-5 = 80, 2-3 = 60, 1-2 = 40, < 1 = 20
        if ($avgActivitiesPerLead >= 5) {
            return 100;
        } elseif ($avgActivitiesPerLead >= 3) {
            return 80;
        } elseif ($avgActivitiesPerLead >= 2) {
            return 60;
        } elseif ($avgActivitiesPerLead >= 1) {
            return 40;
        } else {
            return 20;
        }
    }
}
