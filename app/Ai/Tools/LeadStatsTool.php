<?php

namespace App\Ai\Tools;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class LeadStatsTool implements Tool
{
    public function __construct(
        protected User $user
    ) {}

    public function description(): Stringable|string
    {
        return 'Get lead statistics broken down by status, priority, source, or service. Use this to answer questions about lead counts, distribution, and overall pipeline health.';
    }

    public function handle(Request $request): Stringable|string
    {
        $groupBy = $request['group_by'] ?? 'status';
        $dateRange = $request['date_range'] ?? '30';

        $query = Lead::query()
            ->where('created_at', '>=', now()->subDays((int) $dateRange));

        // Role-based scoping
        if ($this->user->hasAnyRole(['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'])) {
            $query->where('assigned_to', $this->user->id);
        }

        $totalLeads = (clone $query)->count();
        $activeLeads = (clone $query)->active()->count();
        $hotLeads = (clone $query)->hotLeads()->count();

        $breakdown = match ($groupBy) {
            'status' => (clone $query)
                ->selectRaw('inquiry_status, COUNT(*) as count')
                ->groupBy('inquiry_status')
                ->pluck('count', 'inquiry_status')
                ->toArray(),
            'priority' => (clone $query)
                ->selectRaw('priority, COUNT(*) as count')
                ->groupBy('priority')
                ->pluck('count', 'priority')
                ->toArray(),
            'source' => (clone $query)
                ->join('lead_sources', 'leads.lead_source_id', '=', 'lead_sources.id')
                ->selectRaw('lead_sources.name as source_name, COUNT(*) as count')
                ->groupBy('lead_sources.id', 'lead_sources.name')
                ->pluck('count', 'source_name')
                ->toArray(),
            'service' => (clone $query)
                ->join('services', 'leads.service_id', '=', 'services.id')
                ->selectRaw('services.name as service_name, COUNT(*) as count')
                ->groupBy('services.id', 'services.name')
                ->pluck('count', 'service_name')
                ->toArray(),
            default => [],
        };

        $avgLeadScore = (clone $query)->avg('lead_score') ?? 0;

        return json_encode([
            'total_leads' => $totalLeads,
            'active_leads' => $activeLeads,
            'hot_leads' => $hotLeads,
            'avg_lead_score' => round($avgLeadScore, 1),
            'date_range_days' => $dateRange,
            'breakdown_by' => $groupBy,
            'breakdown' => $breakdown,
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'group_by' => $schema->string()
                ->description('How to group the statistics: status, priority, source, or service')
                ->enum(['status', 'priority', 'source', 'service'])
                ->required(),
            'date_range' => $schema->string()
                ->description('Number of days to look back (e.g. 7, 30, 90)')
                ->default('30'),
        ];
    }
}
