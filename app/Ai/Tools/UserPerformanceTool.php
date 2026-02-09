<?php

namespace App\Ai\Tools;

use App\Models\User;
use App\Models\UserPerformanceSnapshot;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class UserPerformanceTool implements Tool
{
    public function __construct(
        protected User $user
    ) {}

    public function description(): Stringable|string
    {
        return 'Get individual or team performance metrics including conversion rates, task completion, call activity, and response times. For managers/admins, shows team-wide stats. For agents, shows their own performance.';
    }

    public function handle(Request $request): Stringable|string
    {
        $scope = $request['scope'] ?? 'personal';
        $date = $request['date'] ?? now()->toDateString();

        // Non-admin users can only see their own performance
        $isAdmin = $this->user->hasAnyRole(['super-admin', 'admin', 'manager', 'team-lead']);

        if ($scope === 'team' && ! $isAdmin) {
            $scope = 'personal';
        }

        if ($scope === 'personal') {
            $snapshot = UserPerformanceSnapshot::where('user_id', $this->user->id)
                ->whereDate('snapshot_date', $date)
                ->first();

            if (! $snapshot) {
                return json_encode(['message' => 'No performance data available for this date.']);
            }

            return json_encode([
                'scope' => 'personal',
                'date' => $date,
                'user' => $this->user->name,
                'role' => $snapshot->role,
                'metrics' => [
                    'assigned_leads' => $snapshot->assigned_leads,
                    'active_leads' => $snapshot->current_active_leads,
                    'qualified_leads' => $snapshot->qualified_leads,
                    'converted_leads' => $snapshot->converted_leads,
                    'conversion_rate' => $snapshot->conversion_rate,
                    'qualification_rate' => $snapshot->qualification_rate,
                    'total_tasks' => $snapshot->total_tasks,
                    'completed_tasks' => $snapshot->completed_tasks,
                    'overdue_tasks' => $snapshot->overdue_tasks,
                    'task_completion_accuracy' => $snapshot->task_completion_accuracy,
                    'avg_first_response_time' => $snapshot->avg_first_response_time,
                    'calls_made' => $snapshot->calls_made,
                    'emails_sent' => $snapshot->emails_sent,
                    'meetings_held' => $snapshot->meetings_held,
                ],
            ]);
        }

        // Team performance
        $snapshots = UserPerformanceSnapshot::whereDate('snapshot_date', $date)
            ->whereNotNull('role')
            ->with('user:id,name')
            ->get();

        $teamSummary = $snapshots->groupBy('role')->map(fn ($group) => [
            'count' => $group->count(),
            'avg_conversion_rate' => round($group->avg('conversion_rate'), 1),
            'total_converted' => $group->sum('converted_leads'),
            'total_calls' => $group->sum('calls_made'),
            'avg_task_completion' => round($group->avg('task_completion_accuracy'), 1),
        ])->toArray();

        $topPerformers = $snapshots->sortByDesc('conversion_rate')
            ->take(5)
            ->map(fn ($s) => [
                'name' => $s->user?->name,
                'role' => $s->role,
                'conversion_rate' => $s->conversion_rate,
                'converted_leads' => $s->converted_leads,
            ])
            ->values()
            ->toArray();

        return json_encode([
            'scope' => 'team',
            'date' => $date,
            'team_summary' => $teamSummary,
            'top_performers' => $topPerformers,
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'scope' => $schema->string()
                ->description('Scope of performance data: personal (your own) or team (all users, admin only)')
                ->enum(['personal', 'team'])
                ->required(),
            'date' => $schema->string()
                ->description('Date for the performance snapshot (YYYY-MM-DD format, defaults to today)'),
        ];
    }
}
