<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyMetric;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Service;
use App\Models\Task;
use App\Models\User;
use App\Models\UserPerformanceSnapshot;
use App\Policies\DashboardPolicy;
use App\Services\BusinessPerformanceMetricsService;
use App\Services\CacheService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    protected const CACHE_TTL = 3600; // 1 hour in seconds

    public function __construct(
        protected CacheService $cacheService,
        protected BusinessPerformanceMetricsService $businessPerformanceService
    ) {}

    public function overview(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! (new DashboardPolicy)->viewDashboard($user)) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $cacheKey = "dashboard:overview:{$user->id}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($user) {
            $userRole = $user->roles->first()?->name ?? 'user';

            // Get role-based dashboard data
            return match (true) {
                $user->hasAnyRole(['super-admin', 'admin']) => $this->getSuperAdminDashboard($user),
                $user->hasAnyRole(['manager', 'team-lead']) => $this->getManagerDashboard($user),
                $user->hasAnyRole(['support-agent', 'senior-support-agent']) => $this->getCRODashboard($user),
                $user->hasAnyRole(['sales-rep', 'senior-sales-rep']) => $this->getAdvisorDashboard($user),
                $user->hasRole('processing') => $this->getProcessingDashboard($user),
                default => $this->getBasicDashboard($user),
            };
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function getSuperAdminDashboard(User $user): array
    {
        $today = Carbon::today();
        $monthStart = $today->copy()->startOfMonth();
        $monthEnd = $today->copy()->endOfMonth();
        $lastMonthStart = $today->copy()->subMonthNoOverflow()->startOfMonth();
        $lastMonthEnd = $lastMonthStart->copy()->endOfMonth();
        $dailyMetric = DailyMetric::whereDate('metric_date', $today->toDateString())->first();

        // Total leads with delta (prefer precomputed DailyMetric, fall back to live count)
        $totalLeads = $dailyMetric?->total_leads ?? Lead::count();
        $leadsThisMonth = Lead::whereBetween('created_at', [$monthStart, $monthEnd])->count();
        $leadsLastMonth = Lead::whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->count();
        $leadsDelta = $leadsLastMonth > 0 ? (($leadsThisMonth - $leadsLastMonth) / $leadsLastMonth) * 100 : 0;

        // Program sales breakdown (created, qualified, won per program)
        $programSales = $this->getProgramSalesBreakdown();

        // Backwards-compatible sales metrics for existing API consumers/tests
        $salesCbi = $programSales['cbi'] ?? ['created' => 0, 'qualified' => 0, 'won' => 0];
        $salesRbi = $programSales['rbi'] ?? ['created' => 0, 'qualified' => 0, 'won' => 0];
        $salesSkilled = $programSales['skilled'] ?? ['created' => 0, 'qualified' => 0, 'won' => 0];

        // LTQ Rate (Lead-to-Qualification %)
        $qualifiedCount = $dailyMetric?->qualified_leads ?? Lead::whereNotNull('qualified_at')->count();
        $ltqRate = $totalLeads > 0 ? round(($qualifiedCount / $totalLeads) * 100, 2) : 0;

        // QTS Rate (Qualification-to-Sale %)
        $wonCount = $dailyMetric?->converted_leads ?? Lead::where('inquiry_status', 'won')->count();
        $qtsRate = $qualifiedCount > 0 ? round(($wonCount / $qualifiedCount) * 100, 2) : 0;

        // Best lead source by conversion rate
        $bestLeadSource = $this->getBestLeadSource();

        // Average lifecycle days (prefer DailyMetric; live query covers won leads from created_at to converted_at, fallback to updated_at)
        $avgLifecycleDays = $dailyMetric?->average_lifecycle_days ?? Lead::where('inquiry_status', 'won')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (COALESCE(converted_at, updated_at) - created_at))/(24*3600)) as avg_days')
            ->value('avg_days');

        // Average lead score
        $avgLeadScore = Lead::whereNotNull('lead_score')->avg('lead_score');

        // System adoption rate (from daily metrics, or compute directly)
        $systemAdoptionRate = $dailyMetric?->system_adoption_rate ?? $this->computeSystemAdoptionRate();

        // Avg leads per advisor per day
        $avgLeadsPerAdvisorPerDay = $this->getAvgLeadsPerAdvisorPerDay();

        return [
            'role' => 'super-admin',
            'kpis' => [
                'total_leads' => $totalLeads,
                'leads_delta' => round($leadsDelta, 2),
                'last_month_leads' => $leadsLastMonth,
                'program_sales' => $programSales,
                // Legacy sales_* keys kept for test/API compatibility
                'sales_cbi' => $salesCbi,
                'sales_rbi' => $salesRbi,
                'sales_skilled' => $salesSkilled,
                'best_lead_source' => $bestLeadSource,
                'ltq_rate' => $ltqRate,
                'qts_rate' => $qtsRate,
                'avg_lifecycle_days' => round($avgLifecycleDays ?? 0, 1),
                'avg_lead_score' => round($avgLeadScore ?? 0, 1),
                'system_adoption_rate' => $systemAdoptionRate,
                'avg_leads_per_advisor_per_day' => $avgLeadsPerAdvisorPerDay,
            ],
        ];
    }

    /**
     * Get created, qualified, and won counts for each program category (CBI, RBI, Skilled).
     *
     * @return array<string, array{created: int, qualified: int, won: int}>
     */
    protected function getProgramSalesBreakdown(): array
    {
        $programs = [
            'cbi' => ['parent' => 'CBI Programs', 'excludeD' => false],
            'rbi' => ['parent' => 'RBI Programs', 'excludeD' => true],
            'skilled' => ['parent' => 'Skilled Immigration', 'excludeD' => false],
        ];

        // Every program defaults to zero so missing parents/leads still return a full shape.
        $result = array_fill_keys(array_keys($programs), ['created' => 0, 'qualified' => 0, 'won' => 0]);

        $parentIds = Service::whereIn('name', array_column($programs, 'parent'))->pluck('id', 'name');

        $parentIdToKey = [];
        $excludeDParentIds = [];
        foreach ($programs as $key => $config) {
            $parentId = $parentIds[$config['parent']] ?? null;
            if ($parentId === null) {
                continue;
            }

            $parentIdToKey[(int) $parentId] = $key;
            if ($config['excludeD']) {
                $excludeDParentIds[] = (int) $parentId;
            }
        }

        if ($parentIdToKey === []) {
            return $result;
        }

        // A lead is excluded from its program when the program drops "D%" services
        // (e.g. RBI Programs) and the lead's service name starts with "D".
        $excludedExpr = $excludeDParentIds === []
            ? 'FALSE'
            : 'services.parent_id IN ('.implode(',', $excludeDParentIds).") AND services.name LIKE 'D%'";

        $rows = Lead::query()
            ->join('services', 'leads.service_id', '=', 'services.id')
            ->whereIn('services.parent_id', array_keys($parentIdToKey))
            ->groupBy('services.parent_id')
            ->selectRaw('services.parent_id as parent_id')
            ->selectRaw("COUNT(*) FILTER (WHERE NOT ({$excludedExpr})) as created")
            ->selectRaw("COUNT(*) FILTER (WHERE NOT ({$excludedExpr}) AND leads.qualified_at IS NOT NULL) as qualified")
            ->selectRaw("COUNT(*) FILTER (WHERE NOT ({$excludedExpr}) AND leads.inquiry_status = 'won') as won")
            ->get();

        foreach ($rows as $row) {
            $key = $parentIdToKey[(int) $row->parent_id] ?? null;
            if ($key === null) {
                continue;
            }

            $result[$key] = [
                'created' => (int) $row->created,
                'qualified' => (int) $row->qualified,
                'won' => (int) $row->won,
            ];
        }

        return $result;
    }

    /**
     * Get the lead source with the highest conversion rate.
     *
     * @return array{name: string, conversion_rate: float, total_leads: int}|null
     */
    protected function getBestLeadSource(): ?array
    {
        $result = Lead::selectRaw('
                lead_sources.name as source_name,
                COUNT(leads.id) as total_leads,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as won_leads
            ')
            ->join('lead_sources', 'leads.lead_source_id', '=', 'lead_sources.id')
            ->groupBy('lead_sources.id', 'lead_sources.name')
            ->havingRaw('COUNT(leads.id) >= 5')
            ->orderByRaw('SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END)::float / COUNT(leads.id) DESC')
            ->first();

        if (! $result) {
            return null;
        }

        $conversionRate = $result->total_leads > 0
            ? round(($result->won_leads / $result->total_leads) * 100, 2)
            : 0;

        return [
            'name' => $result->source_name,
            'conversion_rate' => $conversionRate,
            'total_leads' => (int) $result->total_leads,
        ];
    }

    /**
     * Calculate average leads assigned per advisor per working day.
     */
    protected function getAvgLeadsPerAdvisorPerDay(): float
    {
        $advisorCount = User::role(['sales-rep', 'senior-sales-rep'])->count();

        if ($advisorCount === 0) {
            return 0;
        }

        // Count leads assigned to advisors in the last 30 days
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        $assignedLeads = Lead::where('created_at', '>=', $thirtyDaysAgo)
            ->whereHas('assignedTo', function ($q) {
                $q->role(['sales-rep', 'senior-sales-rep']);
            })
            ->count();

        // Approximate 22 working days in 30 calendar days
        $workingDays = 22;

        return round($assignedLeads / ($advisorCount * $workingDays), 2);
    }

    /**
     * Compute system adoption rate directly from active users.
     */
    protected function computeSystemAdoptionRate(): float
    {
        $totalUsers = User::count();

        if ($totalUsers === 0) {
            return 0;
        }

        // Active users = users with any activity in the last 7 days
        $activeUsers = LeadActivity::where('created_at', '>=', Carbon::now()->subDays(7))
            ->distinct('user_id')
            ->count('user_id');

        return round(($activeUsers / $totalUsers) * 100, 2);
    }

    public function getManagerDashboard(User $user): array
    {
        $today = Carbon::today();
        $dailyMetric = DailyMetric::whereDate('metric_date', $today->toDateString())->first();

        // Compute directly from DB when DailyMetric is not available
        $totalLeads = $dailyMetric?->total_leads ?? Lead::count();
        $qualifiedLeads = $dailyMetric?->qualified_leads ?? Lead::whereNotNull('qualified_at')->count();
        $convertedLeads = $dailyMetric?->converted_leads ?? Lead::where('inquiry_status', 'won')->count();
        $conversionRate = $dailyMetric?->overall_conversion_rate
            ?? ($totalLeads > 0 ? round(($convertedLeads / $totalLeads) * 100, 2) : 0);

        return [
            'role' => 'manager',
            'kpis' => [
                'total_leads' => $totalLeads,
                'conversion_rate' => $conversionRate,
                'qualified_leads' => $qualifiedLeads,
                'converted_leads' => $convertedLeads,
            ],
            'team_performance' => $this->getTeamPerformance($today),
            'response_times' => [
                'avg_first_response' => $dailyMetric?->avg_first_response_time,
                'avg_qualification' => $dailyMetric?->avg_qualification_time,
            ],
        ];
    }

    public function getCRODashboard(User $user): array
    {
        $today = Carbon::today();

        return [
            'role' => 'cro',
            'my_leads' => [
                'assigned' => Lead::where('assigned_to', $user->id)
                    ->whereIn('inquiry_status', ['new', 'assigned_to_cro', 'contacted', 'requalify'])
                    ->count(),
                'pending_qualification' => Lead::where('assigned_to', $user->id)
                    ->where('inquiry_status', 'contacted')
                    ->whereNull('qualified_at')
                    ->count(),
                'qualified_today' => Lead::where('qualified_by', $user->id)
                    ->whereDate('qualified_at', $today)
                    ->count(),
                'won' => Lead::where('qualified_by', $user->id)
                    ->where('inquiry_status', 'won')
                    ->count(),
                'lost' => Lead::where('assigned_to', $user->id)
                    ->where('inquiry_status', 'lost')
                    ->count(),
            ],
            'my_tasks' => [
                'today' => Task::where('assigned_to_id', $user->id)
                    ->whereDate('due_at', $today)
                    ->count(),
                'overdue' => Task::where('assigned_to_id', $user->id)
                    ->where('status', '!=', 'completed')
                    ->where('due_at', '<', $today)
                    ->count(),
            ],
            'my_performance' => $this->getPersonalPerformance($user, $today),
            'hot_leads' => $this->getHotLeadsForUser($user),
        ];
    }

    public function getAdvisorDashboard(User $user): array
    {
        $today = Carbon::today();

        $myLeads = [
            'qualified_assigned' => Lead::where('assigned_to', $user->id)
                ->whereIn('inquiry_status', ['qualified', 'assigned_to_advisor'])
                ->count(),
            'in_proposal' => Lead::where('assigned_to', $user->id)
                ->where('inquiry_status', 'proposal')
                ->count(),
            'converted_today' => Lead::where('assigned_to', $user->id)
                ->where('inquiry_status', 'won')
                ->whereDate('converted_at', $today)
                ->count(),
        ];

        $myTasks = [
            'today' => Task::where('assigned_to_id', $user->id)
                ->whereDate('due_at', $today)
                ->count(),
            'overdue' => Task::where('assigned_to_id', $user->id)
                ->where('status', '!=', 'completed')
                ->where('due_at', '<', $today)
                ->count(),
        ];

        return [
            'role' => 'advisor',
            'my_leads' => $myLeads,
            'my_tasks' => $myTasks,
            'my_performance' => $this->getPersonalPerformance($user, $today),
            'upcoming_meetings' => $this->getUpcomingMeetings($user),
        ];
    }

    public function getProcessingDashboard(User $user): array
    {
        $stages = config('processing.visible_advisor_stages', ['meeting']);
        $today = Carbon::today();

        $leadsQuery = Lead::whereIn('advisor_stage', $stages);

        $total = (clone $leadsQuery)->count();
        $newToday = (clone $leadsQuery)->whereDate('updated_at', $today)->count();

        $byStage = [];
        foreach ($stages as $stage) {
            $byStage[$stage] = Lead::where('advisor_stage', $stage)->count();
        }

        return [
            'role' => 'processing',
            'leads_to_process' => [
                'total' => $total,
                'new_today' => $newToday,
                'by_stage' => $byStage,
            ],
        ];
    }

    public function getBasicDashboard(User $user): array
    {
        return [
            'role' => 'basic',
            'my_tasks' => [
                'pending' => Task::where('assigned_to_id', $user->id)
                    ->where('status', 'pending')
                    ->count(),
                'in_progress' => Task::where('assigned_to_id', $user->id)
                    ->where('status', 'in_progress')
                    ->count(),
            ],
        ];
    }

    protected function getTeamPerformance(Carbon $date): array
    {
        return UserPerformanceSnapshot::whereDate('snapshot_date', $date->toDateString())
            ->whereNotNull('role')
            ->get()
            ->groupBy('role')
            ->map(function ($snapshots) {
                return [
                    'count' => $snapshots->count(),
                    'avg_conversion_rate' => $snapshots->avg('conversion_rate'),
                    'total_converted' => $snapshots->sum('converted_leads'),
                ];
            })
            ->toArray();
    }

    protected function getPersonalPerformance(User $user, Carbon $date): array
    {
        // Compute metrics in real-time instead of relying on scheduled snapshots
        // Use union of assigned_to + qualified_by as the total pool (CROs lose assigned_to after qualification)
        $qualifiedLeads = Lead::where('qualified_by', $user->id)->count();
        $convertedLeads = Lead::where('assigned_to', $user->id)->where('inquiry_status', 'won')->count();
        $totalWorkedLeads = Lead::where('assigned_to', $user->id)
            ->orWhere('qualified_by', $user->id)
            ->count();

        $qualificationRate = $totalWorkedLeads > 0
            ? round(($qualifiedLeads / $totalWorkedLeads) * 100, 2)
            : 0;

        $conversionRate = $totalWorkedLeads > 0
            ? round(($convertedLeads / $totalWorkedLeads) * 100, 2)
            : 0;

        $totalTasks = Task::where('assigned_to_id', $user->id)->count();
        $completedTasks = Task::where('assigned_to_id', $user->id)->where('status', 'completed')->count();
        $taskCompletionAccuracy = $totalTasks > 0
            ? round(($completedTasks / $totalTasks) * 100, 2)
            : 0;

        $totalActivities = LeadActivity::where('user_id', $user->id)
            ->whereDate('created_at', $date)
            ->count();

        // Compare against yesterday's snapshot for deltas
        $yesterday = UserPerformanceSnapshot::where('user_id', $user->id)
            ->whereDate('snapshot_date', $date->copy()->subDay()->toDateString())
            ->first();

        $lastConversion = $yesterday?->conversion_rate ?? 0;
        $lastQualification = $yesterday?->qualification_rate ?? 0;
        $lastTask = $yesterday?->task_completion_accuracy ?? 0;
        $lastActivities = $yesterday?->total_activities ?? 0;

        return [
            'conversion_rate' => $conversionRate,
            'qualification_rate' => $qualificationRate,
            'task_completion_accuracy' => $taskCompletionAccuracy,
            'total_activities' => $totalActivities,
            'conversion_delta' => round($conversionRate - $lastConversion, 2),
            'last_conversion_rate' => $lastConversion,
            'qualification_delta' => round($qualificationRate - $lastQualification, 2),
            'last_qualification_rate' => $lastQualification,
            'task_delta' => round($taskCompletionAccuracy - $lastTask, 2),
            'last_task_completion' => $lastTask,
            'activities_delta' => $lastActivities > 0
                ? round((($totalActivities - $lastActivities) / $lastActivities) * 100, 2)
                : 0,
            'last_activities' => $lastActivities,
        ];
    }

    protected function getHotLeadsForUser(User $user): array
    {
        return Lead::where('assigned_to', $user->id)
            ->where(function ($query) {
                $query->where('lead_score', '>=', 80)
                    ->orWhere('priority', 'high');
            })
            ->whereIn('inquiry_status', ['new', 'assigned_to_cro', 'contacted'])
            ->orderBy('lead_score', 'desc')
            ->limit(5)
            ->get(['id', 'name', 'email', 'lead_score', 'priority', 'created_at'])
            ->toArray();
    }

    protected function getUpcomingMeetings(User $user): array
    {
        return LeadActivity::where('user_id', $user->id)
            ->where('type', 'meeting')
            ->where('status', 'pending')
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at')
            ->limit(5)
            ->with('lead:id,name,email')
            ->get()
            ->toArray();
    }

    protected function getRecentSystemActivity(): array
    {
        return LeadActivity::with('lead:id,name', 'createdBy:id,name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->toArray();
    }

    public function leadsOverview(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|string|in:day,week,month,year',
        ]);

        $period = $request->input('period', 'day');
        $cacheKey = "dashboard:leads_overview:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period) {
            return $this->getLeadsOverviewData($period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getLeadsOverviewData(string $period): array
    {
        // Define date ranges based on period
        $ranges = match ($period) {
            'day' => [
                ['start' => '00:00', 'end' => '04:00', 'label' => '00:00'],
                ['start' => '04:00', 'end' => '08:00', 'label' => '04:00'],
                ['start' => '08:00', 'end' => '12:00', 'label' => '08:00'],
                ['start' => '12:00', 'end' => '16:00', 'label' => '12:00'],
                ['start' => '16:00', 'end' => '20:00', 'label' => '16:00'],
                ['start' => '20:00', 'end' => '23:59', 'label' => '20:00'],
            ],
            'week' => [
                ['day' => 1, 'label' => 'Mon'],
                ['day' => 2, 'label' => 'Tue'],
                ['day' => 3, 'label' => 'Wed'],
                ['day' => 4, 'label' => 'Thu'],
                ['day' => 5, 'label' => 'Fri'],
                ['day' => 6, 'label' => 'Sat'],
                ['day' => 0, 'label' => 'Sun'],
            ],
            'month' => [
                ['week' => 1, 'label' => 'Week 1'],
                ['week' => 2, 'label' => 'Week 2'],
                ['week' => 3, 'label' => 'Week 3'],
                ['week' => 4, 'label' => 'Week 4'],
            ],
            'year' => [
                ['quarter' => 1, 'label' => 'Q1'],
                ['quarter' => 2, 'label' => 'Q2'],
                ['quarter' => 3, 'label' => 'Q3'],
                ['quarter' => 4, 'label' => 'Q4'],
            ],
        };

        $chartData = [];

        foreach ($ranges as $range) {
            $query = Lead::query();

            if ($period === 'day') {
                $today = Carbon::today();
                $query->whereDate('created_at', $today)
                    ->whereTime('created_at', '>=', $range['start'])
                    ->whereTime('created_at', '<=', $range['end']);
            } elseif ($period === 'week') {
                $startOfWeek = Carbon::now()->startOfWeek();
                $query->whereBetween('created_at', [
                    $startOfWeek->copy()->addDays($range['day']),
                    $startOfWeek->copy()->addDays($range['day'])->endOfDay(),
                ]);
            } elseif ($period === 'month') {
                $startOfMonth = Carbon::now()->startOfMonth();
                $query->whereBetween('created_at', [
                    $startOfMonth->copy()->addWeeks($range['week'] - 1),
                    $startOfMonth->copy()->addWeeks($range['week'])->subDay()->endOfDay(),
                ]);
            } elseif ($period === 'year') {
                $startOfYear = Carbon::now()->startOfYear();
                $query->whereBetween('created_at', [
                    $startOfYear->copy()->addMonths(($range['quarter'] - 1) * 3),
                    $startOfYear->copy()->addMonths($range['quarter'] * 3)->subDay()->endOfDay(),
                ]);
            }

            $chartData[] = [
                'period' => $range['label'],
                'deals' => $query->count(),
            ];
        }

        // Calculate statistics
        $totalLeads = Lead::count();
        $closedDeals = Lead::whereIn('inquiry_status', ['won'])->count();
        $activeDealsCount = Lead::whereIn('inquiry_status', ['qualified', 'proposal', 'negotiation'])->count();
        $pipelineValue = $activeDealsCount * 50000; // Average deal value assumption
        $conversionRate = $totalLeads > 0 ? ($closedDeals / $totalLeads) * 100 : 0;

        // Calculate previous period stats for comparison
        $previousPeriodStart = match ($period) {
            'day' => Carbon::yesterday(),
            'week' => Carbon::now()->subWeek(),
            'month' => Carbon::now()->subMonth(),
            'year' => Carbon::now()->subYear(),
        };

        $previousClosedDeals = Lead::whereIn('inquiry_status', ['won', 'converted'])
            ->where('created_at', '>=', $previousPeriodStart)
            ->count();

        $closedDealsChange = $previousClosedDeals > 0
            ? '+'.($closedDeals - $previousClosedDeals).' deals'
            : "+{$closedDeals} deals";

        return [
            'chart_data' => $chartData,
            'statistics' => [
                'closed_deals' => $closedDeals,
                'closed_deals_change' => $closedDealsChange,
                'pipeline_value' => $pipelineValue,
                'pipeline_value_formatted' => '$'.number_format($pipelineValue / 1000000, 1).'M',
                'pipeline_change' => '+$'.number_format(($pipelineValue * 0.15) / 1000, 0).'K',
                'conversion_rate' => round($conversionRate, 0),
                'conversion_change' => '+5%',
            ],
        ];
    }

    public function leadAnalytics(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|string|in:5D,2W,1M,6M',
        ]);

        $period = $request->input('period', '5D');
        $cacheKey = "dashboard:lead_analytics:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period) {
            return $this->getLeadAnalyticsData($period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getLeadAnalyticsData(string $period): array
    {
        $ranges = match ($period) {
            '5D' => [
                ['days' => 4, 'label' => 'Mon'],
                ['days' => 3, 'label' => 'Tue'],
                ['days' => 2, 'label' => 'Wed'],
                ['days' => 1, 'label' => 'Thu'],
                ['days' => 0, 'label' => 'Fri'],
            ],
            '2W' => array_map(fn ($i) => [
                'days' => 13 - ($i * 2),
                'label' => 'W'.($i + 1),
            ], range(0, 5)),
            '1M' => array_map(fn ($i) => [
                'days' => 28 - ($i * 4),
                'label' => 'W'.($i + 1),
            ], range(0, 7)),
            '6M' => [
                ['month' => 5, 'label' => 'Jan'],
                ['month' => 4, 'label' => 'Feb'],
                ['month' => 3, 'label' => 'Mar'],
                ['month' => 2, 'label' => 'Apr'],
                ['month' => 1, 'label' => 'May'],
                ['month' => 0, 'label' => 'Jun'],
            ],
        };

        $chartData = [];

        foreach ($ranges as $range) {
            if (isset($range['days'])) {
                $date = Carbon::now()->subDays($range['days']);
                $count = Lead::whereDate('created_at', $date)->count();
            } elseif (isset($range['month'])) {
                $startDate = Carbon::now()->subMonths($range['month'])->startOfMonth();
                $endDate = Carbon::now()->subMonths($range['month'])->endOfMonth();
                $count = Lead::whereBetween('created_at', [$startDate, $endDate])->count();
            } else {
                $count = 0;
            }

            $chartData[] = [
                'period' => $range['label'],
                'leads' => $count,
            ];
        }

        // Calculate total leads for the period
        $totalLeads = array_sum(array_column($chartData, 'leads'));

        return [
            'chart_data' => $chartData,
            'total_leads' => $totalLeads,
            'growth_percentage' => 18, // This could be calculated based on previous period
        ];
    }

    public function revenuePipeline(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $cacheKey = 'dashboard:revenue_pipeline:'.now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () {
            return $this->getRevenuePipelineData();
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getRevenuePipelineData(): array
    {
        // Define pipeline stages with their inquiry_status values
        $stages = [
            ['name' => 'New Leads', 'statuses' => ['new'], 'color' => '#3b82f6'],
            ['name' => 'Contacted', 'statuses' => ['contacted'], 'color' => '#8b5cf6'],
            ['name' => 'Qualified', 'statuses' => ['qualified'], 'color' => '#10b981'],
            ['name' => 'Won', 'statuses' => ['won'], 'color' => '#f59e0b'],
            ['name' => 'Lost', 'statuses' => ['lost'], 'color' => '#ef4444'],
        ];

        $pipelineData = [];
        $totalValue = 0;

        // Assuming average deal value of $50,000 per lead
        $averageDealValue = 50000;

        foreach ($stages as $stage) {
            $count = Lead::whereIn('inquiry_status', $stage['statuses'])->count();
            $value = $count * $averageDealValue;
            $totalValue += $value;

            $pipelineData[] = [
                'stage' => $stage['name'],
                'count' => $count,
                'value' => $value,
                'color' => $stage['color'],
            ];
        }

        return [
            'pipeline_data' => $pipelineData,
            'total_value' => $totalValue,
            'average_deal_value' => $averageDealValue,
        ];
    }

    public function leadLifecycleFunnel(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|integer|in:7,14,30,60,90',
        ]);

        $period = $request->input('period', 30);
        $cacheKey = "dashboard:lifecycle_funnel:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period) {
            return $this->getLeadLifecycleFunnelData($period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getLeadLifecycleFunnelData(int $days): array
    {
        $startDate = Carbon::now()->subDays($days);

        // Calculate conversion through each stage
        $totalLeads = Lead::where('created_at', '>=', $startDate)->count();
        $contacted = Lead::where('created_at', '>=', $startDate)
            ->whereNotNull('first_cro_contact_at')
            ->count();
        $qualified = Lead::where('created_at', '>=', $startDate)
            ->whereNotNull('qualified_at')
            ->count();
        $converted = Lead::where('created_at', '>=', $startDate)
            ->where(function ($q) {
                $q->whereNotNull('converted_at')
                    ->orWhere('inquiry_status', 'won');
            })
            ->count();

        // Calculate conversion rates
        $contactedRate = $totalLeads > 0 ? ($contacted / $totalLeads) * 100 : 0;
        $qualifiedRate = $contacted > 0 ? ($qualified / $contacted) * 100 : 0;
        $convertedRate = $qualified > 0 ? ($converted / $qualified) * 100 : 0;

        $funnelData = [
            [
                'stage' => 'Total Leads',
                'count' => $totalLeads,
                'percentage' => 100,
                'conversion_rate' => null,
                'color' => '#3b82f6',
            ],
            [
                'stage' => 'Contacted',
                'count' => $contacted,
                'percentage' => $contactedRate,
                'conversion_rate' => $contactedRate,
                'color' => '#8b5cf6',
            ],
            [
                'stage' => 'Qualified',
                'count' => $qualified,
                'percentage' => $totalLeads > 0 ? ($qualified / $totalLeads) * 100 : 0,
                'conversion_rate' => $qualifiedRate,
                'color' => '#10b981',
            ],
            [
                'stage' => 'Converted',
                'count' => $converted,
                'percentage' => $totalLeads > 0 ? ($converted / $totalLeads) * 100 : 0,
                'conversion_rate' => $convertedRate,
                'color' => '#f59e0b',
            ],
        ];

        return [
            'funnel_data' => $funnelData,
            'period_days' => $days,
            'overall_conversion_rate' => $totalLeads > 0 ? ($converted / $totalLeads) * 100 : 0,
        ];
    }

    public function leadDistribution(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'dimension' => 'nullable|string|in:source,service,status',
            'period' => 'nullable|integer|in:7,14,30,60,90',
        ]);

        $dimension = $request->input('dimension', 'source');
        $period = $request->input('period');
        $cacheKey = "dashboard:lead_distribution:{$dimension}:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($dimension, $period) {
            return $this->getLeadDistributionData($dimension, $period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getLeadDistributionData(string $dimension, ?int $period = null): array
    {
        $query = Lead::query();

        if ($period) {
            $query->where('created_at', '>=', Carbon::now()->subDays($period));
        }

        $distribution = match ($dimension) {
            'source' => $query->with('source:id,name')
                ->get()
                ->groupBy('lead_source_id')
                ->map(function ($leads, $sourceId) {
                    $source = $leads->first()->source;

                    return [
                        'name' => $source?->name ?? 'Unknown',
                        'count' => $leads->count(),
                        'percentage' => 0, // Will be calculated below
                    ];
                })
                ->values()
                ->toArray(),

            'service' => $query->with('service:id,name')
                ->get()
                ->groupBy('service_id')
                ->map(function ($leads, $serviceId) {
                    $service = $leads->first()->service;

                    return [
                        'name' => $service?->name ?? 'Unknown',
                        'count' => $leads->count(),
                        'percentage' => 0,
                    ];
                })
                ->values()
                ->toArray(),

            'status' => $query->get()
                ->groupBy('inquiry_status')
                ->map(function ($leads, $status) {
                    return [
                        'name' => ucfirst(str_replace('_', ' ', $status)),
                        'count' => $leads->count(),
                        'percentage' => 0,
                    ];
                })
                ->values()
                ->toArray(),

            default => [],
        };

        // Calculate percentages
        $total = array_sum(array_column($distribution, 'count'));
        $distribution = array_map(function ($item) use ($total) {
            $item['percentage'] = $total > 0 ? ($item['count'] / $total) * 100 : 0;

            return $item;
        }, $distribution);

        return [
            'distribution_data' => $distribution,
            'total_leads' => $total,
            'dimension' => $dimension,
        ];
    }

    public function activityHeatmap(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|integer|in:7,14,30',
        ]);

        $period = $request->input('period', 30);
        $cacheKey = "dashboard:activity_heatmap:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period) {
            return $this->getActivityHeatmapData($period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getActivityHeatmapData(int $days): array
    {
        $startDate = Carbon::now()->subDays($days);

        // Get all activities within the period
        $activities = LeadActivity::where('created_at', '>=', $startDate)
            ->get();

        // Initialize heatmap data structure (7 days x 24 hours)
        $heatmap = [];
        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        foreach ($dayNames as $dayIndex => $dayName) {
            for ($hour = 0; $hour < 24; $hour++) {
                $heatmap[] = [
                    'day' => $dayName,
                    'hour' => $hour,
                    'count' => 0,
                ];
            }
        }

        // Count activities by day and hour
        foreach ($activities as $activity) {
            $dayOfWeek = $activity->created_at->dayOfWeek; // 0-6 (Sunday-Saturday)
            $hour = $activity->created_at->hour;

            $index = ($dayOfWeek * 24) + $hour;
            if (isset($heatmap[$index])) {
                $heatmap[$index]['count']++;
            }
        }

        // Find max count for normalization
        $maxCount = max(array_column($heatmap, 'count'));

        // Calculate intensity (0-1)
        $heatmap = array_map(function ($item) use ($maxCount) {
            $item['intensity'] = $maxCount > 0 ? $item['count'] / $maxCount : 0;

            return $item;
        }, $heatmap);

        return [
            'heatmap_data' => $heatmap,
            'period_days' => $days,
            'total_activities' => $activities->count(),
            'max_count' => $maxCount,
        ];
    }

    public function conversionByService(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|integer|in:7,14,30,60,90',
        ]);

        $period = $request->input('period', 30);
        $cacheKey = "dashboard:conversion_by_service:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period) {
            return $this->getConversionByServiceData($period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getConversionByServiceData(int $days): array
    {
        $startDate = Carbon::now()->subDays($days);

        $services = Lead::with('service:id,name')
            ->where('created_at', '>=', $startDate)
            ->get()
            ->groupBy('service_id')
            ->map(function ($leads, $serviceId) {
                $service = $leads->first()->service;
                $totalLeads = $leads->count();
                $convertedLeads = $leads->where('inquiry_status', 'won')->count();
                $conversionRate = $totalLeads > 0 ? ($convertedLeads / $totalLeads) * 100 : 0;

                return [
                    'service' => $service?->name ?? 'Unknown',
                    'total_leads' => $totalLeads,
                    'converted_leads' => $convertedLeads,
                    'conversion_rate' => round($conversionRate, 2),
                ];
            })
            ->sortByDesc('conversion_rate')
            ->values()
            ->toArray();

        return [
            'conversion_data' => $services,
            'period_days' => $days,
        ];
    }

    public function activityTimeline(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|integer|in:7,14,30',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        $period = $request->input('period', 7);
        $userId = $request->input('user_id');
        $cacheKey = "dashboard:activity_timeline:{$period}:".($userId ?? 'all').':'.now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period, $userId) {
            return $this->getActivityTimelineData($period, $userId);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getActivityTimelineData(int $days, ?int $userId = null): array
    {
        $startDate = Carbon::now()->subDays($days);

        $query = LeadActivity::with(['lead:id,name', 'createdBy:id,name'])
            ->where('created_at', '>=', $startDate);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $activities = $query->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        // Group activities by date
        $timeline = $activities->groupBy(function ($activity) {
            return $activity->created_at->format('Y-m-d');
        })->map(function ($dayActivities, $date) {
            $activityTypes = $dayActivities->groupBy('type')->map->count();

            return [
                'date' => $date,
                'total_activities' => $dayActivities->count(),
                'activity_types' => $activityTypes->toArray(),
                'activities' => $dayActivities->take(10)->map(function ($activity) {
                    return [
                        'id' => $activity->id,
                        'type' => $activity->type,
                        'description' => $activity->description,
                        'lead_name' => $activity->lead?->name ?? 'Unknown',
                        'user_name' => $activity->createdBy?->name ?? 'Unknown',
                        'created_at' => $activity->created_at->toIso8601String(),
                    ];
                })->toArray(),
            ];
        })->values()->toArray();

        // Get activity type summary
        $typeSummary = $activities->groupBy('type')->map(function ($typeActivities, $type) {
            return [
                'type' => $type,
                'count' => $typeActivities->count(),
            ];
        })->sortByDesc('count')->values()->toArray();

        return [
            'timeline_data' => $timeline,
            'type_summary' => $typeSummary,
            'period_days' => $days,
            'total_activities' => $activities->count(),
        ];
    }

    public function leadSourcePerformance(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|integer|in:7,14,30,60,90',
        ]);

        $period = $request->input('period', 30);
        $cacheKey = "dashboard:lead_source_performance:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period) {
            return $this->getLeadSourcePerformanceData($period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getLeadSourcePerformanceData(int $days): array
    {
        $startDate = Carbon::now()->subDays($days);

        $sourcePerformance = Lead::selectRaw('
                lead_sources.name as source_name,
                lead_sources.id as source_id,
                COUNT(leads.id) as total_leads,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as converted_leads,
                SUM(CASE WHEN leads.inquiry_status = \'lost\' THEN 1 ELSE 0 END) as lost_leads,
                SUM(CASE WHEN leads.qualified_at IS NOT NULL THEN 1 ELSE 0 END) as qualified_leads,
                AVG(leads.lead_score) as avg_lead_score,
                AVG(CASE
                    WHEN leads.first_cro_contact_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (leads.first_cro_contact_at - leads.created_at))/60
                    ELSE NULL
                END) as avg_response_time_minutes
            ')
            ->join('lead_sources', 'leads.lead_source_id', '=', 'lead_sources.id')
            ->where('leads.created_at', '>=', $startDate)
            ->groupBy('lead_sources.id', 'lead_sources.name')
            ->get();

        $performanceData = $sourcePerformance->map(function ($source) {
            $conversionRate = $source->total_leads > 0
                ? ($source->converted_leads / $source->total_leads) * 100
                : 0;

            $qualificationRate = $source->total_leads > 0
                ? ($source->qualified_leads / $source->total_leads) * 100
                : 0;

            $lossRate = $source->total_leads > 0
                ? ($source->lost_leads / $source->total_leads) * 100
                : 0;

            // Calculate quality score (0-100)
            $qualityScore = ($conversionRate * 0.5) +
                           ($qualificationRate * 0.3) +
                           (min(100, $source->avg_lead_score) * 0.2);

            // Calculate ROI estimate (placeholder - would need actual revenue data)
            $estimatedRevenue = $source->converted_leads * 50000; // Assume $50k per conversion
            $estimatedCost = $source->total_leads * 100; // Assume $100 per lead
            $roi = $estimatedCost > 0 ? (($estimatedRevenue - $estimatedCost) / $estimatedCost) * 100 : 0;

            return [
                'source_id' => $source->source_id,
                'source_name' => $source->source_name,
                'total_leads' => (int) $source->total_leads,
                'converted_leads' => (int) $source->converted_leads,
                'qualified_leads' => (int) $source->qualified_leads,
                'lost_leads' => (int) $source->lost_leads,
                'conversion_rate' => round($conversionRate, 2),
                'qualification_rate' => round($qualificationRate, 2),
                'loss_rate' => round($lossRate, 2),
                'avg_lead_score' => round($source->avg_lead_score ?? 0, 2),
                'avg_response_time_minutes' => round($source->avg_response_time_minutes ?? 0, 2),
                'quality_score' => round($qualityScore, 2),
                'estimated_roi' => round($roi, 2),
            ];
        })->sortByDesc('quality_score')->values()->toArray();

        $totalLeads = $sourcePerformance->sum('total_leads');
        $totalConverted = $sourcePerformance->sum('converted_leads');
        $overallConversionRate = $totalLeads > 0 ? ($totalConverted / $totalLeads) * 100 : 0;

        return [
            'source_performance' => $performanceData,
            'period_days' => $days,
            'total_leads' => $totalLeads,
            'total_converted' => $totalConverted,
            'overall_conversion_rate' => round($overallConversionRate, 2),
            'best_source' => $performanceData[0] ?? null,
            'worst_source' => end($performanceData) ?: null,
        ];
    }

    public function programPerformance(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|integer|in:7,14,30,60,90,180,365',
        ]);

        $period = $request->input('period', 90);
        $cacheKey = "dashboard:program_performance:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period) {
            return $this->getProgramPerformanceData($period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getProgramPerformanceData(int $days): array
    {
        $startDate = Carbon::now()->subDays($days);

        // Get performance metrics grouped by service country (program)
        $programPerformance = Lead::selectRaw('
                COALESCE(NULLIF(services.country_name, \'\'), services.name) as program_name,
                COALESCE(NULLIF(services.country_code, \'\'), services.name) as program_code,
                COUNT(leads.id) as total_leads,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as converted_leads,
                SUM(CASE WHEN leads.inquiry_status = \'lost\' THEN 1 ELSE 0 END) as lost_leads,
                SUM(CASE WHEN leads.qualified_at IS NOT NULL THEN 1 ELSE 0 END) as qualified_leads,
                SUM(CASE WHEN leads.inquiry_status IN (\'new\', \'contacted\') THEN 1 ELSE 0 END) as active_leads,
                AVG(CASE
                    WHEN leads.converted_at IS NOT NULL AND leads.inquiry_status = \'won\'
                    THEN EXTRACT(EPOCH FROM (leads.converted_at - leads.created_at))/(24*3600)
                    ELSE NULL
                END) as avg_conversion_days,
                AVG(CASE
                    WHEN leads.first_cro_contact_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (leads.first_cro_contact_at - leads.created_at))/60
                    ELSE NULL
                END) as avg_response_time_minutes
            ')
            ->join('services', 'leads.service_id', '=', 'services.id')
            ->where('leads.created_at', '>=', $startDate)
            ->groupBy('services.id', 'services.country_code', 'services.country_name', 'services.name')
            ->get();

        $performanceData = $programPerformance->map(function ($program) {
            $conversionRate = $program->total_leads > 0
                ? ($program->converted_leads / $program->total_leads) * 100
                : 0;

            $qualificationRate = $program->total_leads > 0
                ? ($program->qualified_leads / $program->total_leads) * 100
                : 0;

            $lossRate = $program->total_leads > 0
                ? ($program->lost_leads / $program->total_leads) * 100
                : 0;

            $activeRate = $program->total_leads > 0
                ? ($program->active_leads / $program->total_leads) * 100
                : 0;

            return [
                'program_name' => $program->program_name,
                'program_code' => $program->program_code,
                'total_leads' => (int) $program->total_leads,
                'converted_leads' => (int) $program->converted_leads,
                'qualified_leads' => (int) $program->qualified_leads,
                'lost_leads' => (int) $program->lost_leads,
                'active_leads' => (int) $program->active_leads,
                'conversion_rate' => round($conversionRate, 2),
                'qualification_rate' => round($qualificationRate, 2),
                'loss_rate' => round($lossRate, 2),
                'active_rate' => round($activeRate, 2),
                'avg_conversion_days' => round($program->avg_conversion_days ?? 0, 2),
                'avg_response_time_minutes' => round($program->avg_response_time_minutes ?? 0, 2),
            ];
        })->sortByDesc('conversion_rate')->values()->toArray();

        // Calculate trend data (week-over-week comparison if period allows)
        $trendData = [];
        if ($days >= 14) {
            $midDate = Carbon::now()->subDays($days / 2);
            $firstHalfData = $this->calculateProgramTrend($startDate, $midDate);
            $secondHalfData = $this->calculateProgramTrend($midDate, Carbon::now());

            foreach ($performanceData as $program) {
                $programCode = $program['program_code'];
                $firstHalf = $firstHalfData[$programCode] ?? 0;
                $secondHalf = $secondHalfData[$programCode] ?? 0;

                $trend = $firstHalf > 0 ? (($secondHalf - $firstHalf) / $firstHalf) * 100 : 0;
                $trendData[$programCode] = round($trend, 2);
            }
        }

        $totalLeads = $programPerformance->sum('total_leads');
        $totalConverted = $programPerformance->sum('converted_leads');
        $overallConversionRate = $totalLeads > 0 ? ($totalConverted / $totalLeads) * 100 : 0;

        return [
            'program_performance' => $performanceData,
            'program_trends' => $trendData,
            'period_days' => $days,
            'total_leads' => $totalLeads,
            'total_converted' => $totalConverted,
            'overall_conversion_rate' => round($overallConversionRate, 2),
            'best_program' => $performanceData[0] ?? null,
            'programs_count' => count($performanceData),
        ];
    }

    protected function calculateProgramTrend(Carbon $startDate, Carbon $endDate): array
    {
        $data = Lead::selectRaw('
                COALESCE(NULLIF(services.country_code, \'\'), services.name) as program_code,
                SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as converted
            ')
            ->join('services', 'leads.service_id', '=', 'services.id')
            ->whereBetween('leads.created_at', [$startDate, $endDate])
            ->groupBy('services.id', 'services.country_code', 'services.name')
            ->get()
            ->pluck('converted', 'program_code')
            ->toArray();

        return $data;
    }

    public function taskCompletionAnalysis(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|integer|in:7,14,30,60,90',
            'user_id' => 'nullable|integer|exists:users,id',
        ]);

        $period = $request->input('period', 30);
        $userId = $request->input('user_id');
        $cacheKey = "dashboard:task_completion_analysis:{$period}:".($userId ?? 'all').':'.now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period, $userId) {
            return $this->getTaskCompletionAnalysisData($period, $userId);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getTaskCompletionAnalysisData(int $days, ?int $userId = null): array
    {
        $startDate = Carbon::now()->subDays($days);

        // Build base query
        $query = Task::where('created_at', '>=', $startDate);
        if ($userId) {
            $query->where('assigned_to_id', $userId);
        }

        // Overall metrics
        $totalTasks = (clone $query)->count();
        $completedTasks = (clone $query)->where('status', 'completed')->count();
        $overdueTasks = (clone $query)
            ->where('status', '!=', 'completed')
            ->where('due_at', '<', Carbon::now())
            ->count();
        $accuracyRate = $totalTasks > 0 ? ($completedTasks / $totalTasks) * 100 : 0;

        // Accuracy trend over time (weekly)
        $weeks = (int) ceil($days / 7);
        $accuracyTrend = [];
        for ($i = 0; $i < $weeks; $i++) {
            $weekStart = Carbon::now()->subDays(($i + 1) * 7);
            $weekEnd = Carbon::now()->subDays($i * 7);

            $weekQuery = (clone $query)->whereBetween('created_at', [$weekStart, $weekEnd]);
            $weekTotal = $weekQuery->count();
            $weekCompleted = (clone $weekQuery)->where('status', 'completed')->count();
            $weekAccuracy = $weekTotal > 0 ? ($weekCompleted / $weekTotal) * 100 : 0;

            $accuracyTrend[] = [
                'week' => 'Week '.($weeks - $i),
                'period' => $weekStart->format('M d').' - '.$weekEnd->format('M d'),
                'total_tasks' => $weekTotal,
                'completed_tasks' => $weekCompleted,
                'accuracy_rate' => round($weekAccuracy, 2),
            ];
        }

        // Task type breakdown
        $taskTypeBreakdown = Task::selectRaw('
                type,
                COUNT(*) as total,
                SUM(CASE WHEN status = \'completed\' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status != \'completed\' AND due_at < NOW() THEN 1 ELSE 0 END) as overdue
            ')
            ->where('created_at', '>=', $startDate)
            ->when($userId, fn ($q) => $q->where('assigned_to_id', $userId))
            ->groupBy('type')
            ->get()
            ->map(function ($typeData) {
                $completionRate = $typeData->total > 0 ? ($typeData->completed / $typeData->total) * 100 : 0;
                $overdueRate = $typeData->total > 0 ? ($typeData->overdue / $typeData->total) * 100 : 0;

                return [
                    'type' => $typeData->type ?? 'general',
                    'total_tasks' => (int) $typeData->total,
                    'completed_tasks' => (int) $typeData->completed,
                    'overdue_tasks' => (int) $typeData->overdue,
                    'completion_rate' => round($completionRate, 2),
                    'overdue_rate' => round($overdueRate, 2),
                ];
            })
            ->sortByDesc('completion_rate')
            ->values()
            ->toArray();

        // Overdue task analysis
        $overdueAnalysis = Task::selectRaw('
                priority,
                COUNT(*) as overdue_count,
                AVG(EXTRACT(EPOCH FROM (NOW() - due_at))/(24*3600)) as avg_days_overdue
            ')
            ->where('status', '!=', 'completed')
            ->where('due_at', '<', Carbon::now())
            ->where('created_at', '>=', $startDate)
            ->when($userId, fn ($q) => $q->where('assigned_to_id', $userId))
            ->groupBy('priority')
            ->get()
            ->map(function ($priority) {
                return [
                    'priority' => $priority->priority,
                    'overdue_count' => (int) $priority->overdue_count,
                    'avg_days_overdue' => round($priority->avg_days_overdue ?? 0, 2),
                ];
            })
            ->sortByDesc('overdue_count')
            ->values()
            ->toArray();

        // On-time completion rate (completed before due date)
        $onTimeCompleted = Task::where('status', 'completed')
            ->where('created_at', '>=', $startDate)
            ->whereRaw('updated_at <= due_at')
            ->when($userId, fn ($q) => $q->where('assigned_to_id', $userId))
            ->count();
        $onTimeRate = $completedTasks > 0 ? ($onTimeCompleted / $completedTasks) * 100 : 0;

        return [
            'overall_metrics' => [
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'overdue_tasks' => $overdueTasks,
                'accuracy_rate' => round($accuracyRate, 2),
                'on_time_rate' => round($onTimeRate, 2),
            ],
            'accuracy_trend' => array_reverse($accuracyTrend),
            'task_type_breakdown' => $taskTypeBreakdown,
            'overdue_analysis' => $overdueAnalysis,
            'period_days' => $days,
            'user_filtered' => $userId !== null,
        ];
    }

    public function leadLifecycleAnalysis(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'period' => 'nullable|integer|in:7,14,30,60,90,180',
        ]);

        $period = $request->input('period', 90);
        $cacheKey = "dashboard:lead_lifecycle_analysis:{$period}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($period) {
            return $this->getLeadLifecycleAnalysisData($period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    protected function getLeadLifecycleAnalysisData(int $days): array
    {
        $startDate = Carbon::now()->subDays($days);

        // Lifecycle stage breakdown with counts and durations
        $stageBreakdown = Lead::selectRaw('
                inquiry_status as stage,
                COUNT(*) as total_leads,
                AVG(CASE
                    WHEN first_cro_contact_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (first_cro_contact_at - created_at))/(24*3600)
                    ELSE NULL
                END) as avg_days_to_contact,
                AVG(CASE
                    WHEN qualified_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (qualified_at - created_at))/(24*3600)
                    ELSE NULL
                END) as avg_days_to_qualify,
                AVG(CASE
                    WHEN converted_at IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (converted_at - created_at))/(24*3600)
                    ELSE NULL
                END) as avg_days_to_convert
            ')
            ->where('created_at', '>=', $startDate)
            ->groupBy('inquiry_status')
            ->get()
            ->map(function ($stage) {
                return [
                    'stage' => $stage->stage,
                    'total_leads' => (int) $stage->total_leads,
                    'avg_days_to_contact' => round($stage->avg_days_to_contact ?? 0, 2),
                    'avg_days_to_qualify' => round($stage->avg_days_to_qualify ?? 0, 2),
                    'avg_days_to_convert' => round($stage->avg_days_to_convert ?? 0, 2),
                ];
            })
            ->toArray();

        // Bottleneck identification - stages where leads stay longest without progressing
        $bottlenecks = [];
        $stageTransitions = [
            'new' => ['next' => 'contacted', 'expected_days' => 1],
            'contacted' => ['next' => 'qualified', 'expected_days' => 7],
            'qualified' => ['next' => 'proposal', 'expected_days' => 14],
            'proposal' => ['next' => 'won', 'expected_days' => 30],
        ];

        foreach ($stageTransitions as $currentStage => $transition) {
            $avgDaysInStage = Lead::selectRaw('
                    AVG(EXTRACT(EPOCH FROM (COALESCE(updated_at, NOW()) - created_at))/(24*3600)) as avg_days
                ')
                ->where('inquiry_status', $currentStage)
                ->where('created_at', '>=', $startDate)
                ->value('avg_days');

            $leadsStuck = Lead::where('inquiry_status', $currentStage)
                ->whereRaw('EXTRACT(EPOCH FROM (NOW() - created_at))/(24*3600) > ?', [$transition['expected_days'] * 2])
                ->count();

            if ($avgDaysInStage > $transition['expected_days']) {
                $bottlenecks[] = [
                    'stage' => $currentStage,
                    'expected_days' => $transition['expected_days'],
                    'actual_avg_days' => round($avgDaysInStage, 2),
                    'delay_days' => round($avgDaysInStage - $transition['expected_days'], 2),
                    'leads_stuck' => $leadsStuck,
                    'severity' => $this->calculateBottleneckSeverity($avgDaysInStage, $transition['expected_days']),
                ];
            }
        }

        // Stage duration visualization data
        $stageDurations = [
            [
                'stage' => 'New → Contacted',
                'avg_days' => Lead::whereNotNull('first_cro_contact_at')
                    ->where('created_at', '>=', $startDate)
                    ->selectRaw('AVG(EXTRACT(EPOCH FROM (first_cro_contact_at - created_at))/(24*3600)) as avg')
                    ->value('avg') ?? 0,
            ],
            [
                'stage' => 'Contacted → Qualified',
                'avg_days' => Lead::whereNotNull('qualified_at')
                    ->whereNotNull('first_cro_contact_at')
                    ->where('created_at', '>=', $startDate)
                    ->selectRaw('AVG(EXTRACT(EPOCH FROM (qualified_at - first_cro_contact_at))/(24*3600)) as avg')
                    ->value('avg') ?? 0,
            ],
            [
                'stage' => 'Qualified → Won',
                'avg_days' => Lead::where('inquiry_status', 'won')
                    ->whereNotNull('qualified_at')
                    ->where('created_at', '>=', $startDate)
                    ->selectRaw('AVG(EXTRACT(EPOCH FROM (COALESCE(converted_at, updated_at) - qualified_at))/(24*3600)) as avg')
                    ->value('avg') ?? 0,
            ],
        ];

        $stageDurations = array_map(function ($stage) {
            $stage['avg_days'] = round($stage['avg_days'], 2);

            return $stage;
        }, $stageDurations);

        // Lead velocity metrics
        $totalLeads = Lead::where('created_at', '>=', $startDate)->count();
        $convertedLeads = Lead::where('inquiry_status', 'won')
            ->where('created_at', '>=', $startDate)
            ->count();

        $avgLifecycleDays = Lead::where('inquiry_status', 'won')
            ->where('created_at', '>=', $startDate)
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (COALESCE(converted_at, updated_at) - created_at))/(24*3600)) as avg_days')
            ->value('avg_days');

        $velocity = $convertedLeads > 0 && $avgLifecycleDays > 0
            ? $convertedLeads / $avgLifecycleDays // leads per day
            : 0;

        return [
            'stage_breakdown' => $stageBreakdown,
            'bottlenecks' => $bottlenecks,
            'stage_durations' => $stageDurations,
            'velocity_metrics' => [
                'total_leads' => $totalLeads,
                'converted_leads' => $convertedLeads,
                'avg_lifecycle_days' => round($avgLifecycleDays ?? 0, 2),
                'conversion_velocity' => round($velocity, 4), // leads converted per day
            ],
            'period_days' => $days,
        ];
    }

    protected function calculateBottleneckSeverity(float $actualDays, float $expectedDays): string
    {
        $ratio = $actualDays / $expectedDays;

        if ($ratio >= 3) {
            return 'critical';
        } elseif ($ratio >= 2) {
            return 'high';
        } elseif ($ratio >= 1.5) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    public function quarterlyPerformanceTrends(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'quarters' => 'nullable|integer|min:2|max:8',
        ]);

        $quarters = $request->input('quarters', 4);
        $cacheKey = "dashboard:quarterly_performance_trends:{$quarters}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($quarters) {
            return $this->getQuarterlyPerformanceTrendsData($quarters);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    /**
     * @return array{trends: array, programs: string[]}
     */
    protected function getQuarterlyPerformanceTrendsData(int $quarters): array
    {
        $trends = [];
        $programNames = [];

        // Get child service IDs under CBI Programs and RBI Programs
        $cbiRbiParentIds = Service::whereIn('name', ['CBI Programs', 'RBI Programs'])
            ->pluck('id');
        $childServiceIds = Service::whereIn('parent_id', $cbiRbiParentIds)
            ->pluck('id');
        // Include parent IDs too (leads can point directly to the parent)
        $allServiceIds = $childServiceIds->merge($cbiRbiParentIds);

        for ($i = $quarters - 1; $i >= 0; $i--) {
            $quarterStart = Carbon::now()->subQuarters($i)->startOfQuarter();
            $quarterEnd = Carbon::now()->subQuarters($i)->endOfQuarter();
            $label = 'Q'.$quarterStart->quarter.' '.$quarterStart->year;

            // Overall stats for this quarter
            $totalLeads = Lead::whereBetween('created_at', [$quarterStart, $quarterEnd])->count();
            $wonLeads = Lead::where('inquiry_status', 'won')
                ->whereBetween('created_at', [$quarterStart, $quarterEnd])
                ->count();
            $conversionRate = $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 2) : 0;

            // Per child-service breakdown
            $programData = Lead::selectRaw('
                    services.name as program_name,
                    COUNT(leads.id) as total_leads,
                    SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as won_leads
                ')
                ->join('services', 'leads.service_id', '=', 'services.id')
                ->whereIn('services.id', $allServiceIds)
                ->whereBetween('leads.created_at', [$quarterStart, $quarterEnd])
                ->groupBy('services.name')
                ->get();

            $quarterEntry = [
                'quarter' => $label,
                'total_leads' => $totalLeads,
                'won_leads' => $wonLeads,
                'conversion_rate' => $conversionRate,
            ];

            foreach ($programData as $program) {
                $name = $program->program_name;
                $programNames[] = $name;
                $quarterEntry['programs'][$name] = [
                    'total_leads' => (int) $program->total_leads,
                    'won_leads' => (int) $program->won_leads,
                    'conversion_rate' => $program->total_leads > 0
                        ? round(($program->won_leads / $program->total_leads) * 100, 2)
                        : 0,
                ];
            }

            $trends[] = $quarterEntry;
        }

        return [
            'trends' => $trends,
            'programs' => array_values(array_unique($programNames)),
        ];
    }

    /**
     * Ad source won-leads time series — monthly breakdown per lead source.
     */
    public function adSourceTimeSeries(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDashboard($request->user())) {
            abort(403, 'Unauthorized to view dashboard');
        }

        $request->validate([
            'months' => 'nullable|integer|min:3|max:12',
        ]);

        $months = $request->input('months', 6);
        $cacheKey = "dashboard:ad_source_time_series:{$months}:".now()->format('Y-m-d');

        $data = $this->cacheService->remember($cacheKey, function () use ($months) {
            return $this->getAdSourceTimeSeriesData($months);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    /**
     * @return array{series: array, sources: string[]}
     */
    protected function getAdSourceTimeSeriesData(int $months): array
    {
        $series = [];
        $sourceNames = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $monthStart = Carbon::now()->subMonths($i)->startOfMonth();
            $monthEnd = Carbon::now()->subMonths($i)->endOfMonth();
            $label = $monthStart->format('M Y');

            $sourceData = Lead::selectRaw('
                    lead_sources.name as source_name,
                    COUNT(leads.id) as total_leads,
                    SUM(CASE WHEN leads.inquiry_status = \'won\' THEN 1 ELSE 0 END) as won_leads
                ')
                ->join('lead_sources', 'leads.lead_source_id', '=', 'lead_sources.id')
                ->whereBetween('leads.created_at', [$monthStart, $monthEnd])
                ->groupBy('lead_sources.name')
                ->get();

            $entry = ['month' => $label];

            foreach ($sourceData as $source) {
                $name = $source->source_name;
                $sourceNames[] = $name;
                $entry['sources'][$name] = [
                    'total_leads' => (int) $source->total_leads,
                    'won_leads' => (int) $source->won_leads,
                ];
            }

            $series[] = $entry;
        }

        return [
            'series' => $series,
            'sources' => array_values(array_unique($sourceNames)),
        ];
    }
}
