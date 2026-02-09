<?php

namespace App\Ai\Tools;

use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class ActivitySummaryTool implements Tool
{
    public function __construct(
        protected User $user
    ) {}

    public function description(): Stringable|string
    {
        return 'Get a summary of tasks, follow-ups, and activities including pending items, overdue items, and items due today. Helps track daily workload and outstanding actions.';
    }

    public function handle(Request $request): Stringable|string
    {
        $filter = $request['filter'] ?? 'all';

        $query = LeadActivity::query()->with(['lead:id,name,inquiry_status']);

        // Role-based scoping
        if ($this->user->hasAnyRole(['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'])) {
            $query->where('user_id', $this->user->id);
        }

        $pendingCount = (clone $query)->pending()->count();
        $overdueCount = (clone $query)->overdue()->count();
        $dueTodayCount = (clone $query)->dueToday()->count();
        $completedTodayCount = (clone $query)->completed()
            ->whereDate('completed_at', today())
            ->count();

        $items = match ($filter) {
            'overdue' => (clone $query)->overdue()
                ->orderBy('due_at')
                ->limit(10)
                ->get(),
            'due_today' => (clone $query)->dueToday()
                ->orderBy('due_at')
                ->limit(10)
                ->get(),
            'upcoming' => (clone $query)->upcoming(7)
                ->limit(10)
                ->get(),
            default => (clone $query)->pending()
                ->orderByRaw('CASE WHEN due_at < NOW() THEN 0 ELSE 1 END, due_at ASC NULLS LAST')
                ->limit(15)
                ->get(),
        };

        $formattedItems = $items->map(fn (LeadActivity $activity) => [
            'id' => $activity->id,
            'type' => $activity->type,
            'subject' => $activity->subject,
            'status' => $activity->status,
            'priority' => $activity->priority,
            'lead_name' => $activity->lead?->name,
            'lead_status' => $activity->lead?->inquiry_status,
            'due_at' => $activity->due_at?->toDateTimeString(),
            'time_until_due' => $activity->due_at?->diffForHumans(),
            'is_overdue' => $activity->is_overdue,
            'scheduled_at' => $activity->scheduled_at?->toDateTimeString(),
        ])->toArray();

        // Activity breakdown by type for last 7 days
        $typeBreakdown = (clone $query)->recent(7)
            ->selectRaw('type, COUNT(*) as count')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->toArray();

        return json_encode([
            'summary' => [
                'pending' => $pendingCount,
                'overdue' => $overdueCount,
                'due_today' => $dueTodayCount,
                'completed_today' => $completedTodayCount,
            ],
            'filter' => $filter,
            'items' => $formattedItems,
            'activity_types_last_7_days' => $typeBreakdown,
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'filter' => $schema->string()
                ->description('Which activities to show: all (pending sorted by urgency), overdue, due_today, or upcoming (next 7 days)')
                ->enum(['all', 'overdue', 'due_today', 'upcoming'])
                ->required(),
        ];
    }
}
