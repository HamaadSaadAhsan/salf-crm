<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class ReportService
{
    protected const CACHE_TTL = 3600;

    /**
     * Leads Overall — Summary KPIs + trend + status breakdown.
     *
     * @return array{summary: array, chart_data: array, table_data: array}
     */
    public function leadsOverall(array $filters, User $user): array
    {
        $query = $this->baseQuery($filters, $user);

        $total = (clone $query)->count();
        $won = (clone $query)->where('inquiry_status', 'won')->count();
        $lost = (clone $query)->where('inquiry_status', 'lost')->count();
        $qualified = (clone $query)->whereNotNull('qualified_at')->count();
        $newLeads = (clone $query)->where('inquiry_status', 'new')->count();

        $conversionRate = $total > 0 ? round(($won / $total) * 100, 2) : 0;
        $qualificationRate = $total > 0 ? round(($qualified / $total) * 100, 2) : 0;

        $groupBy = $filters['group_by'] ?? 'day';
        $chartData = $this->getTrendData(clone $query, $filters, $groupBy);

        $statusBreakdown = (clone $query)
            ->selectRaw('inquiry_status, COUNT(*) as count')
            ->groupBy('inquiry_status')
            ->pluck('count', 'inquiry_status')
            ->toArray();

        return [
            'summary' => [
                'total_leads' => $total,
                'won_leads' => $won,
                'lost_leads' => $lost,
                'qualified_leads' => $qualified,
                'new_leads' => $newLeads,
                'conversion_rate' => $conversionRate,
                'qualification_rate' => $qualificationRate,
            ],
            'chart_data' => $chartData,
            'table_data' => $statusBreakdown,
        ];
    }

    /**
     * Leads by Office — Qualified leads distributed across offices.
     *
     * @return array{summary: array, chart_data: array, table_data: array}
     */
    public function leadsByOffice(array $filters, User $user): array
    {
        $query = $this->baseQuery($filters, $user);

        $officeData = (clone $query)
            ->selectRaw('
                offices.id as office_id,
                offices.name as office_name,
                COUNT(leads.id) as total_leads,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as won_leads,
                SUM(CASE WHEN leads.inquiry_status = \'lost\' THEN 1 ELSE 0 END) as lost_leads,
                SUM(CASE WHEN leads.qualified_at IS NOT NULL THEN 1 ELSE 0 END) as qualified_leads
            ')
            ->join('users', 'leads.assigned_to', '=', 'users.id')
            ->join('offices', 'users.office_id', '=', 'offices.id')
            ->groupBy('offices.id', 'offices.name')
            ->get()
            ->map(fn ($row) => [
                'office_id' => $row->office_id,
                'office_name' => $row->office_name,
                'total_leads' => (int) $row->total_leads,
                'won_leads' => (int) $row->won_leads,
                'lost_leads' => (int) $row->lost_leads,
                'qualified_leads' => (int) $row->qualified_leads,
                'conversion_rate' => $row->total_leads > 0
                    ? round(($row->won_leads / $row->total_leads) * 100, 2)
                    : 0,
            ])
            ->sortByDesc('total_leads')
            ->values()
            ->toArray();

        $total = array_sum(array_column($officeData, 'total_leads'));
        $totalWon = array_sum(array_column($officeData, 'won_leads'));

        return [
            'summary' => [
                'total_leads' => $total,
                'total_won' => $totalWon,
                'total_offices' => count($officeData),
                'overall_conversion_rate' => $total > 0 ? round(($totalWon / $total) * 100, 2) : 0,
            ],
            'chart_data' => $officeData,
            'table_data' => $officeData,
        ];
    }

    /**
     * Leads by Support Agent — CRO/support-agent qualification metrics.
     *
     * @return array{summary: array, chart_data: array, table_data: array}
     */
    public function leadsBySupportAgent(array $filters, User $user): array
    {
        $query = $this->baseQuery($filters, $user);

        $agentData = (clone $query)
            ->selectRaw('
                users.id as user_id,
                users.name as agent_name,
                COUNT(leads.id) as total_leads,
                SUM(CASE WHEN leads.qualified_at IS NOT NULL THEN 1 ELSE 0 END) as qualified_leads,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as won_leads,
                SUM(CASE WHEN leads.inquiry_status = \'lost\' THEN 1 ELSE 0 END) as lost_leads,
                AVG(CASE
                    WHEN leads.first_cro_contact_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (leads.first_cro_contact_at - leads.created_at))/60
                    ELSE NULL
                END) as avg_response_time_minutes
            ')
            ->join('users', 'leads.qualified_by', '=', 'users.id')
            ->groupBy('users.id', 'users.name')
            ->get()
            ->map(fn ($row) => [
                'user_id' => $row->user_id,
                'agent_name' => $row->agent_name,
                'total_leads' => (int) $row->total_leads,
                'qualified_leads' => (int) $row->qualified_leads,
                'won_leads' => (int) $row->won_leads,
                'lost_leads' => (int) $row->lost_leads,
                'qualification_rate' => $row->total_leads > 0
                    ? round(($row->qualified_leads / $row->total_leads) * 100, 2)
                    : 0,
                'avg_response_time_minutes' => round($row->avg_response_time_minutes ?? 0, 2),
            ])
            ->sortByDesc('total_leads')
            ->values()
            ->toArray();

        $total = array_sum(array_column($agentData, 'total_leads'));
        $totalQualified = array_sum(array_column($agentData, 'qualified_leads'));

        return [
            'summary' => [
                'total_leads' => $total,
                'total_qualified' => $totalQualified,
                'total_agents' => count($agentData),
                'overall_qualification_rate' => $total > 0 ? round(($totalQualified / $total) * 100, 2) : 0,
            ],
            'chart_data' => $agentData,
            'table_data' => $agentData,
        ];
    }

    /**
     * Leads by Sales Rep — Advisor/sales-rep conversion metrics.
     *
     * @return array{summary: array, chart_data: array, table_data: array}
     */
    public function leadsBySalesRep(array $filters, User $user): array
    {
        $query = $this->baseQuery($filters, $user);

        $repData = (clone $query)
            ->selectRaw('
                users.id as user_id,
                users.name as rep_name,
                COUNT(leads.id) as total_leads,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as won_leads,
                SUM(CASE WHEN leads.inquiry_status = \'lost\' THEN 1 ELSE 0 END) as lost_leads,
                SUM(CASE WHEN leads.inquiry_status IN (\'proposal\', \'assigned_to_advisor\') THEN 1 ELSE 0 END) as in_pipeline,
                AVG(CASE
                    WHEN leads.converted_at IS NOT NULL AND leads.inquiry_status = \'won\'
                    THEN EXTRACT(EPOCH FROM (leads.converted_at - leads.created_at))/(24*3600)
                    ELSE NULL
                END) as avg_conversion_days
            ')
            ->join('users', 'leads.assigned_to', '=', 'users.id')
            ->groupBy('users.id', 'users.name')
            ->get()
            ->map(fn ($row) => [
                'user_id' => $row->user_id,
                'rep_name' => $row->rep_name,
                'total_leads' => (int) $row->total_leads,
                'won_leads' => (int) $row->won_leads,
                'lost_leads' => (int) $row->lost_leads,
                'in_pipeline' => (int) $row->in_pipeline,
                'conversion_rate' => $row->total_leads > 0
                    ? round(($row->won_leads / $row->total_leads) * 100, 2)
                    : 0,
                'avg_conversion_days' => round($row->avg_conversion_days ?? 0, 2),
            ])
            ->sortByDesc('won_leads')
            ->values()
            ->toArray();

        $total = array_sum(array_column($repData, 'total_leads'));
        $totalWon = array_sum(array_column($repData, 'won_leads'));

        return [
            'summary' => [
                'total_leads' => $total,
                'total_won' => $totalWon,
                'total_reps' => count($repData),
                'overall_conversion_rate' => $total > 0 ? round(($totalWon / $total) * 100, 2) : 0,
            ],
            'chart_data' => $repData,
            'table_data' => $repData,
        ];
    }

    /**
     * Leads by Source — Lead source performance comparison.
     *
     * @return array{summary: array, chart_data: array, table_data: array}
     */
    public function leadsBySource(array $filters, User $user): array
    {
        $query = $this->baseQuery($filters, $user);

        $sourceData = (clone $query)
            ->selectRaw('
                lead_sources.id as source_id,
                lead_sources.name as source_name,
                COUNT(leads.id) as total_leads,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as won_leads,
                SUM(CASE WHEN leads.inquiry_status = \'lost\' THEN 1 ELSE 0 END) as lost_leads,
                SUM(CASE WHEN leads.qualified_at IS NOT NULL THEN 1 ELSE 0 END) as qualified_leads
            ')
            ->join('lead_sources', 'leads.lead_source_id', '=', 'lead_sources.id')
            ->groupBy('lead_sources.id', 'lead_sources.name')
            ->get()
            ->map(fn ($row) => [
                'source_id' => $row->source_id,
                'source_name' => $row->source_name,
                'total_leads' => (int) $row->total_leads,
                'won_leads' => (int) $row->won_leads,
                'lost_leads' => (int) $row->lost_leads,
                'qualified_leads' => (int) $row->qualified_leads,
                'conversion_rate' => $row->total_leads > 0
                    ? round(($row->won_leads / $row->total_leads) * 100, 2)
                    : 0,
                'qualification_rate' => $row->total_leads > 0
                    ? round(($row->qualified_leads / $row->total_leads) * 100, 2)
                    : 0,
            ])
            ->sortByDesc('total_leads')
            ->values()
            ->toArray();

        $total = array_sum(array_column($sourceData, 'total_leads'));
        $totalWon = array_sum(array_column($sourceData, 'won_leads'));

        return [
            'summary' => [
                'total_leads' => $total,
                'total_won' => $totalWon,
                'total_sources' => count($sourceData),
                'overall_conversion_rate' => $total > 0 ? round(($totalWon / $total) * 100, 2) : 0,
                'best_source' => $sourceData[0] ?? null,
            ],
            'chart_data' => $sourceData,
            'table_data' => $sourceData,
        ];
    }

    /**
     * Leads by Service — Service/program performance comparison.
     *
     * @return array{summary: array, chart_data: array, table_data: array}
     */
    public function leadsByService(array $filters, User $user): array
    {
        $query = $this->baseQuery($filters, $user);

        $serviceData = (clone $query)
            ->selectRaw('
                services.id as service_id,
                services.name as service_name,
                COUNT(leads.id) as total_leads,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as won_leads,
                SUM(CASE WHEN leads.inquiry_status = \'lost\' THEN 1 ELSE 0 END) as lost_leads,
                SUM(CASE WHEN leads.qualified_at IS NOT NULL THEN 1 ELSE 0 END) as qualified_leads
            ')
            ->join('services', 'leads.service_id', '=', 'services.id')
            ->groupBy('services.id', 'services.name')
            ->get()
            ->map(fn ($row) => [
                'service_id' => $row->service_id,
                'service_name' => $row->service_name,
                'total_leads' => (int) $row->total_leads,
                'won_leads' => (int) $row->won_leads,
                'lost_leads' => (int) $row->lost_leads,
                'qualified_leads' => (int) $row->qualified_leads,
                'conversion_rate' => $row->total_leads > 0
                    ? round(($row->won_leads / $row->total_leads) * 100, 2)
                    : 0,
            ])
            ->sortByDesc('total_leads')
            ->values()
            ->toArray();

        $total = array_sum(array_column($serviceData, 'total_leads'));
        $totalWon = array_sum(array_column($serviceData, 'won_leads'));

        return [
            'summary' => [
                'total_leads' => $total,
                'total_won' => $totalWon,
                'total_services' => count($serviceData),
                'overall_conversion_rate' => $total > 0 ? round(($totalWon / $total) * 100, 2) : 0,
            ],
            'chart_data' => $serviceData,
            'table_data' => $serviceData,
        ];
    }

    /**
     * Won Leads (Conversion) — Detailed analysis of converted leads.
     *
     * @return array{summary: array, chart_data: array, table_data: array}
     */
    public function leadsConversion(array $filters, User $user): array
    {
        $query = $this->baseQuery($filters, $user)->where('inquiry_status', 'won');

        $total = (clone $query)->count();

        $avgConversionDays = (clone $query)
            ->whereNotNull('converted_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (converted_at - created_at))/(24*3600)) as avg_days')
            ->value('avg_days');

        $groupBy = $filters['group_by'] ?? 'day';
        $chartData = $this->getTrendData(clone $query, $filters, $groupBy);

        $bySource = (clone $query)
            ->selectRaw('lead_sources.name as source_name, COUNT(*) as count')
            ->join('lead_sources', 'leads.lead_source_id', '=', 'lead_sources.id')
            ->groupBy('lead_sources.name')
            ->orderByDesc('count')
            ->get()
            ->toArray();

        $byService = (clone $query)
            ->selectRaw('services.name as service_name, COUNT(*) as count')
            ->join('services', 'leads.service_id', '=', 'services.id')
            ->groupBy('services.name')
            ->orderByDesc('count')
            ->get()
            ->toArray();

        return [
            'summary' => [
                'total_won' => $total,
                'avg_conversion_days' => round($avgConversionDays ?? 0, 2),
            ],
            'chart_data' => $chartData,
            'table_data' => [
                'by_source' => $bySource,
                'by_service' => $byService,
            ],
        ];
    }

    /**
     * Lost Leads — Lost leads with loss reason breakdown.
     *
     * @return array{summary: array, chart_data: array, table_data: array}
     */
    public function leadsLost(array $filters, User $user): array
    {
        $query = $this->baseQuery($filters, $user)->where('inquiry_status', 'lost');

        $total = (clone $query)->count();

        $reasonBreakdown = (clone $query)
            ->selectRaw("COALESCE(loss_reason, 'Not Specified') as reason, COUNT(*) as count")
            ->groupBy('loss_reason')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'reason' => $row->reason,
                'count' => (int) $row->count,
                'percentage' => $total > 0 ? round(($row->count / $total) * 100, 2) : 0,
            ])
            ->toArray();

        $groupBy = $filters['group_by'] ?? 'day';
        $chartData = $this->getTrendData(clone $query, $filters, $groupBy);

        $bySource = (clone $query)
            ->selectRaw('lead_sources.name as source_name, COUNT(*) as count')
            ->join('lead_sources', 'leads.lead_source_id', '=', 'lead_sources.id')
            ->groupBy('lead_sources.name')
            ->orderByDesc('count')
            ->get()
            ->toArray();

        return [
            'summary' => [
                'total_lost' => $total,
                'top_reason' => $reasonBreakdown[0] ?? null,
            ],
            'chart_data' => $chartData,
            'table_data' => [
                'reasons' => $reasonBreakdown,
                'by_source' => $bySource,
            ],
        ];
    }

    /**
     * Build base query with filters and role-based scoping.
     */
    protected function baseQuery(array $filters, User $user): Builder
    {
        $query = Lead::query();

        $this->scopeByUserRole($query, $user);

        if (! empty($filters['date_from'])) {
            $query->where('leads.created_at', '>=', Carbon::parse($filters['date_from'])->startOfDay());
        }

        if (! empty($filters['date_to'])) {
            $query->where('leads.created_at', '<=', Carbon::parse($filters['date_to'])->endOfDay());
        }

        if (! empty($filters['office_id'])) {
            $userIds = User::where('office_id', $filters['office_id'])->pluck('id');
            $query->whereIn('leads.assigned_to', $userIds);
        }

        if (! empty($filters['zone_id'])) {
            $query->where('leads.zone_id', $filters['zone_id']);
        }

        if (! empty($filters['service_id'])) {
            $query->whereIn('leads.service_id', (array) $filters['service_id']);
        }

        if (! empty($filters['source_id'])) {
            $query->whereIn('leads.lead_source_id', (array) $filters['source_id']);
        }

        if (! empty($filters['user_id'])) {
            $query->where(function (Builder $q) use ($filters) {
                $q->where('leads.assigned_to', $filters['user_id'])
                    ->orWhere('leads.qualified_by', $filters['user_id']);
            });
        }

        return $query;
    }

    /**
     * Scope query by user role for data access control.
     */
    protected function scopeByUserRole(Builder $query, User $user): void
    {
        if ($user->hasAnyRole(['super-admin', 'admin', 'manager', 'team-lead'])) {
            return;
        }

        if ($user->hasAnyRole(['support-agent', 'senior-support-agent'])) {
            $query->where(function (Builder $q) use ($user) {
                $q->where('leads.qualified_by', $user->id)
                    ->orWhere('leads.assigned_to', $user->id);
            });

            return;
        }

        if ($user->hasAnyRole(['sales-rep', 'senior-sales-rep'])) {
            $query->where('leads.assigned_to', $user->id);

            return;
        }

        $query->where('leads.assigned_to', $user->id);
    }

    /**
     * Generate trend data grouped by day, week, or month.
     *
     * @return array<int, array{period: string, count: int}>
     */
    protected function getTrendData(Builder $query, array $filters, string $groupBy): array
    {
        $dateFormat = match ($groupBy) {
            'week' => "TO_CHAR(DATE_TRUNC('week', leads.created_at), 'YYYY-MM-DD')",
            'month' => "TO_CHAR(leads.created_at, 'YYYY-MM')",
            default => "TO_CHAR(leads.created_at, 'YYYY-MM-DD')",
        };

        return $query
            ->selectRaw("{$dateFormat} as period, COUNT(*) as count")
            ->groupByRaw($dateFormat)
            ->orderByRaw("{$dateFormat} ASC")
            ->get()
            ->map(fn ($row) => [
                'period' => $row->period,
                'count' => (int) $row->count,
            ])
            ->toArray();
    }

    /**
     * Generate cache key for a report.
     */
    public static function cacheKey(string $type, int $userId, array $filters): string
    {
        $filterHash = md5(json_encode($filters));

        return "reports:{$type}:{$userId}:{$filterHash}";
    }
}
