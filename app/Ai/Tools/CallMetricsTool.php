<?php

namespace App\Ai\Tools;

use App\Models\CallSession;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class CallMetricsTool implements Tool
{
    public function __construct(
        protected User $user
    ) {}

    public function description(): Stringable|string
    {
        return 'Get call metrics including total calls, average duration, and breakdown by direction (inbound/outbound) or status. Use this for call activity analysis.';
    }

    public function handle(Request $request): Stringable|string
    {
        $dateRange = (int) ($request['date_range'] ?? '30');
        $groupBy = $request['group_by'] ?? 'direction';

        $query = CallSession::query()
            ->where('created_at', '>=', now()->subDays($dateRange));

        // Role-based scoping
        if ($this->user->hasAnyRole(['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'])) {
            $query->where('caller_id', $this->user->id);
        }

        $totalCalls = (clone $query)->count();
        $answeredCalls = (clone $query)->where('status', 'ended')->whereNotNull('answered_at')->count();
        $avgDuration = (clone $query)->whereNotNull('duration')->avg('duration');
        $totalDuration = (clone $query)->whereNotNull('duration')->sum('duration');

        $breakdown = match ($groupBy) {
            'direction' => (clone $query)
                ->selectRaw('call_direction, COUNT(*) as count, AVG(duration) as avg_duration')
                ->groupBy('call_direction')
                ->get()
                ->mapWithKeys(fn ($row) => [$row->call_direction => [
                    'count' => $row->count,
                    'avg_duration_seconds' => round($row->avg_duration ?? 0),
                ]])
                ->toArray(),
            'status' => (clone $query)
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->pluck('count', 'status')
                ->toArray(),
            default => [],
        };

        $answerRate = $totalCalls > 0 ? round(($answeredCalls / $totalCalls) * 100, 1) : 0;

        return json_encode([
            'total_calls' => $totalCalls,
            'answered_calls' => $answeredCalls,
            'answer_rate' => $answerRate,
            'avg_duration_seconds' => round($avgDuration ?? 0),
            'total_duration_minutes' => round(($totalDuration ?? 0) / 60),
            'date_range_days' => $dateRange,
            'breakdown_by' => $groupBy,
            'breakdown' => $breakdown,
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'group_by' => $schema->string()
                ->description('How to group call metrics: direction or status')
                ->enum(['direction', 'status'])
                ->required(),
            'date_range' => $schema->string()
                ->description('Number of days to look back (e.g. 7, 30, 90)')
                ->default('30'),
        ];
    }
}
