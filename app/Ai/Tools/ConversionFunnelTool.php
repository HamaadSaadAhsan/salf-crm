<?php

namespace App\Ai\Tools;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ConversionFunnelTool implements Tool
{
    public function __construct(
        protected User $user
    ) {}

    public function description(): Stringable|string
    {
        return 'Get conversion funnel data showing how leads progress through pipeline stages (new → contacted → qualified → converted → won). Includes conversion rates between stages.';
    }

    public function handle(Request $request): Stringable|string
    {
        $dateRange = (int) ($request['date_range'] ?? '30');

        $baseQuery = Lead::query()
            ->where('created_at', '>=', now()->subDays($dateRange));

        // Role-based scoping
        if ($this->user->hasAnyRole(['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'])) {
            $baseQuery->where('assigned_to', $this->user->id);
        }

        $totalLeads = (clone $baseQuery)->count();
        $contacted = (clone $baseQuery)->whereNotIn('inquiry_status', ['new'])->count();
        $qualified = (clone $baseQuery)->whereNotNull('qualified_at')->count();
        $converted = (clone $baseQuery)->whereNotNull('converted_at')->count();
        $won = (clone $baseQuery)->where('inquiry_status', 'won')->count();
        $lost = (clone $baseQuery)->where('inquiry_status', 'lost')->count();

        // Calculate conversion rates between stages
        $contactedRate = $totalLeads > 0 ? round(($contacted / $totalLeads) * 100, 1) : 0;
        $qualifiedRate = $contacted > 0 ? round(($qualified / $contacted) * 100, 1) : 0;
        $convertedRate = $qualified > 0 ? round(($converted / $qualified) * 100, 1) : 0;
        $wonRate = $converted > 0 ? round(($won / $converted) * 100, 1) : 0;
        $overallRate = $totalLeads > 0 ? round(($won / $totalLeads) * 100, 1) : 0;

        // Average time between stages
        $avgResponseTime = (clone $baseQuery)
            ->whereNotNull('first_cro_contact_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (first_cro_contact_at - created_at))/3600) as avg_hours')
            ->value('avg_hours');

        $avgQualificationTime = (clone $baseQuery)
            ->whereNotNull('qualified_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (qualified_at - created_at))/3600) as avg_hours')
            ->value('avg_hours');

        return json_encode([
            'date_range_days' => $dateRange,
            'funnel' => [
                ['stage' => 'Total Leads', 'count' => $totalLeads, 'rate' => 100],
                ['stage' => 'Contacted', 'count' => $contacted, 'rate' => $contactedRate],
                ['stage' => 'Qualified', 'count' => $qualified, 'rate' => $qualifiedRate],
                ['stage' => 'Converted', 'count' => $converted, 'rate' => $convertedRate],
                ['stage' => 'Won', 'count' => $won, 'rate' => $wonRate],
            ],
            'overall_conversion_rate' => $overallRate,
            'lost_count' => $lost,
            'avg_first_response_hours' => round($avgResponseTime ?? 0, 1),
            'avg_qualification_hours' => round($avgQualificationTime ?? 0, 1),
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'date_range' => $schema->string()
                ->description('Number of days to look back (e.g. 7, 30, 90)')
                ->default('30')
                ->required(),
        ];
    }
}
