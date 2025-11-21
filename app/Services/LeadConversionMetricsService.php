<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\LeadConversionMetric;
use App\Models\LeadSource;
use App\Models\Service;
use Carbon\Carbon;

class LeadConversionMetricsService
{
    public function calculate(Carbon $date): void
    {
        // Calculate conversion metrics by service
        $services = Service::all();
        foreach ($services as $service) {
            $this->calculateForDimension($date, 'service', $service->name, $service->id, null, null);
        }

        // Calculate conversion metrics by lead source
        $sources = LeadSource::all();
        foreach ($sources as $source) {
            $this->calculateForDimension($date, 'source', $source->name, null, $source->id, null);
        }

        // Calculate overall metrics
        $this->calculateForDimension($date, 'overall', 'all', null, null, null);
    }

    protected function calculateForDimension(
        Carbon $date,
        string $dimensionType,
        string $dimensionValue,
        ?int $serviceId,
        ?int $leadSourceId,
        ?int $userId
    ): void {
        $query = Lead::query();

        if ($serviceId) {
            $query->where('service_id', $serviceId);
        }

        if ($leadSourceId) {
            $query->where('lead_source_id', $leadSourceId);
        }

        if ($userId) {
            $query->where('assigned_to', $userId);
        }

        // Get totals up to the date
        $totalLeads = (clone $query)->whereDate('created_at', '<=', $date)->count();
        $newLeads = (clone $query)->whereDate('created_at', $date)->count();
        $contactedLeads = (clone $query)->whereNotNull('first_cro_contact_at')
            ->whereDate('first_cro_contact_at', '<=', $date)
            ->count();
        $qualifiedLeads = (clone $query)->whereNotNull('qualified_at')
            ->whereDate('qualified_at', '<=', $date)
            ->count();
        $convertedLeads = (clone $query)->where('inquiry_status', 'won')
            ->whereDate('converted_at', '<=', $date)
            ->count();
        $lostLeads = (clone $query)->where('inquiry_status', 'lost')
            ->whereDate('updated_at', '<=', $date)
            ->count();

        $conversionRate = $totalLeads > 0 ? ($convertedLeads / $totalLeads) * 100 : 0;
        $qualificationRate = $totalLeads > 0 ? ($qualifiedLeads / $totalLeads) * 100 : 0;

        // Get period information
        $periodType = null;
        $periodValue = null;

        LeadConversionMetric::updateOrCreate(
            [
                'metric_date' => $date->toDateString(),
                'dimension_type' => $dimensionType,
                'dimension_value' => $dimensionValue,
            ],
            [
                'service_id' => $serviceId,
                'lead_source_id' => $leadSourceId,
                'user_id' => $userId,
                'total_leads' => $totalLeads,
                'new_leads' => $newLeads,
                'contacted_leads' => $contactedLeads,
                'qualified_leads' => $qualifiedLeads,
                'converted_leads' => $convertedLeads,
                'lost_leads' => $lostLeads,
                'conversion_rate' => round($conversionRate, 2),
                'qualification_rate' => round($qualificationRate, 2),
                'revenue_generated' => 0, // TODO: Calculate from deal values
                'average_deal_value' => 0, // TODO: Calculate from deal values
                'period_type' => $periodType,
                'period_value' => $periodValue,
            ]
        );
    }
}
