<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DailyMetric;
use App\Models\DepartmentHandoffMetric;
use App\Models\Lead;
use App\Models\LeadConversionMetric;
use App\Models\SystemAdoptionMetric;
use App\Models\UserPerformanceSnapshot;
use App\Policies\DashboardPolicy;
use App\Services\BusinessPerformanceMetricsService;
use App\Services\CacheService;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MetricsController extends Controller
{
    protected const CACHE_TTL = 3600; // 1 hour

    public function __construct(
        protected CacheService $cacheService,
        protected BusinessPerformanceMetricsService $businessPerformanceService
    ) {}

    public function conversion(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewConversionMetrics($request->user())) {
            abort(403, 'Unauthorized to view conversion metrics');
        }

        $request->validate([
            'dimension' => 'nullable|string|in:service,source,overall',
            'period' => 'nullable|string|in:day,week,month,year',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $dimension = $request->input('dimension', 'overall');
        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->toDateString());

        $cacheKey = "metrics:conversion:{$dimension}:{$startDate}:{$endDate}";

        $data = $this->cacheService->remember($cacheKey, function () use ($dimension, $startDate, $endDate) {
            return LeadConversionMetric::where('dimension_type', $dimension)
                ->whereBetween('metric_date', [$startDate, $endDate])
                ->orderBy('metric_date')
                ->get();
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function businessPerformance(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewTeamMetrics($request->user())) {
            abort(403, 'Unauthorized to view team metrics');
        }

        $request->validate([
            'period' => 'nullable|string|in:day,week,month,year',
            'date' => 'nullable|date',
        ]);

        $period = $request->input('period', 'day');
        $date = Carbon::parse($request->input('date', now()));

        $cacheKey = "metrics:business_performance:{$period}:".$date->toDateString();

        $data = $this->cacheService->remember($cacheKey, function () use ($date, $period) {
            return $this->businessPerformanceService->calculateForPeriod($date, $period);
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function departmentHandoff(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewDepartmentMetrics($request->user())) {
            abort(403, 'Unauthorized to view department metrics');
        }

        $request->validate([
            'from' => 'nullable|string',
            'to' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->toDateString());

        $cacheKey = "metrics:department_handoff:{$startDate}:{$endDate}";

        $data = $this->cacheService->remember($cacheKey, function () use ($request, $startDate, $endDate) {
            $query = DepartmentHandoffMetric::whereBetween('metric_date', [$startDate, $endDate]);

            if ($request->filled('from')) {
                $query->where('from_department', $request->input('from'));
            }

            if ($request->filled('to')) {
                $query->where('to_department', $request->input('to'));
            }

            return $query->orderBy('metric_date')->get();
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function systemAdoption(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewSystemMetrics($request->user())) {
            abort(403, 'Unauthorized to view system metrics');
        }

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->toDateString());

        $cacheKey = "metrics:system_adoption:{$startDate}:{$endDate}";

        $data = $this->cacheService->remember($cacheKey, function () use ($startDate, $endDate) {
            return SystemAdoptionMetric::whereBetween('metric_date', [$startDate, $endDate])
                ->orderBy('metric_date')
                ->get();
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function userPerformance(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $userId = $request->input('user_id', $user->id);

        // Check if user can view other users' performance
        if ($userId != $user->id && ! $user->hasAnyRole(['super-admin', 'admin', 'manager', 'team-lead'])) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->toDateString());

        $cacheKey = "metrics:user_performance:{$userId}:{$startDate}:{$endDate}";

        $data = $this->cacheService->remember($cacheKey, function () use ($userId, $startDate, $endDate) {
            return UserPerformanceSnapshot::where('user_id', $userId)
                ->whereBetween('snapshot_date', [$startDate, $endDate])
                ->orderBy('snapshot_date')
                ->get();
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    public function dailyMetrics(Request $request): JsonResponse
    {
        if (! (new DashboardPolicy)->viewAllMetrics($request->user())) {
            abort(403, 'Unauthorized to view all metrics');
        }

        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $startDate = $request->input('start_date', Carbon::now()->subDays(30)->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->toDateString());

        $cacheKey = "metrics:daily:{$startDate}:{$endDate}";

        $data = $this->cacheService->remember($cacheKey, function () use ($startDate, $endDate) {
            $metrics = DailyMetric::whereBetween('metric_date', [$startDate, $endDate])
                ->orderBy('metric_date')
                ->get();

            // Fallback: compute on-the-fly when DailyMetric table is empty
            if ($metrics->isEmpty()) {
                return $this->computeDailyMetricsFallback($startDate, $endDate);
            }

            return $metrics;
        }, self::CACHE_TTL);

        return response()->json($data);
    }

    /**
     * Compute daily metrics on-the-fly when no pre-calculated data exists.
     */
    protected function computeDailyMetricsFallback(string $startDate, string $endDate): array
    {
        $period = CarbonPeriod::create($startDate, $endDate);
        $metrics = [];

        foreach ($period as $date) {
            $dateStr = $date->toDateString();
            $totalLeads = Lead::whereDate('created_at', '<=', $dateStr)->count();
            $newLeadsToday = Lead::whereDate('created_at', $dateStr)->count();
            $wonLeads = Lead::where('inquiry_status', 'won')
                ->whereDate('created_at', '<=', $dateStr)
                ->count();
            $conversionRate = $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 2) : 0;

            $metrics[] = [
                'metric_date' => $dateStr,
                'total_leads' => $totalLeads,
                'new_leads_today' => $newLeadsToday,
                'overall_conversion_rate' => $conversionRate,
                'qualified_leads' => Lead::whereNotNull('qualified_at')
                    ->whereDate('qualified_at', '<=', $dateStr)
                    ->count(),
                'converted_leads' => $wonLeads,
            ];
        }

        return $metrics;
    }
}
