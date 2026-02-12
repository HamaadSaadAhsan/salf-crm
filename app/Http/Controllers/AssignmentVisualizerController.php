<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use App\Models\Service;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AssignmentVisualizerController extends Controller
{
    public function page(): Response
    {
        return Inertia::render('assignment-visualizer/index');
    }

    public function index(): JsonResponse
    {
        $parentServices = Service::query()
            ->whereNull('parent_id')
            ->with(['children:id,name,detail,country_code,country_name,parent_id'])
            ->select(['id', 'name', 'detail', 'country_code', 'country_name'])
            ->orderBy('name')
            ->get();

        $allServiceIds = $parentServices->pluck('id')
            ->merge($parentServices->pluck('children')->flatten()->pluck('id'))
            ->unique()
            ->values();

        // Get lead counts grouped by service, assigned_to, and inquiry_status
        $leadCounts = Lead::query()
            ->whereIn('service_id', $allServiceIds)
            ->whereNotNull('assigned_to')
            ->select('service_id', 'assigned_to', 'inquiry_status', DB::raw('COUNT(*) as count'))
            ->groupBy('service_id', 'assigned_to', 'inquiry_status')
            ->get();

        // Get advisors assigned to these services via pivot
        $serviceUsers = DB::table('service_user')
            ->whereIn('service_id', $allServiceIds)
            ->where('status', 'active')
            ->pluck('user_id', 'service_id')
            ->toArray();

        // Collect unique user IDs (from both pivot and actual leads)
        $userIds = collect($serviceUsers)->values()
            ->merge($leadCounts->pluck('assigned_to'))
            ->unique()
            ->values();

        $advisors = User::query()
            ->whereIn('id', $userIds)
            ->select(['id', 'name', 'email', 'avatar', 'current_lead_count', 'conversion_rate', 'performance_weight', 'availability'])
            ->get()
            ->keyBy('id');

        // Build pivot lookup: service_id => [user_ids]
        $servicePivot = DB::table('service_user')
            ->whereIn('service_id', $allServiceIds)
            ->where('status', 'active')
            ->get()
            ->groupBy('service_id')
            ->map(fn ($rows) => $rows->pluck('user_id')->unique()->values());

        // Index lead counts for fast lookup
        $leadIndex = [];
        foreach ($leadCounts as $row) {
            $leadIndex[$row->service_id][$row->assigned_to][$row->inquiry_status] = $row->count;
        }

        $servicesData = $parentServices->map(function (Service $parent) use ($leadIndex, $servicePivot, $advisors) {
            $childrenData = $parent->children->map(function (Service $child) use ($leadIndex, $servicePivot, $advisors) {
                return $this->buildServiceData($child, $leadIndex, $servicePivot, $advisors);
            });

            $parentData = $this->buildServiceData($parent, $leadIndex, $servicePivot, $advisors);
            $parentData['children'] = $childrenData;

            // Aggregate child stats into parent
            $parentData['total_leads'] += $childrenData->sum('total_leads');
            $parentData['total_advisors'] = collect([$parentData['advisor_ids']])
                ->merge($childrenData->pluck('advisor_ids'))
                ->flatten()
                ->unique()
                ->count();

            // Recalculate fairness including children
            $allAdvisorLeads = collect([$parentData['advisor_leads']])
                ->merge($childrenData->pluck('advisor_leads'))
                ->flatten()
                ->toArray();

            $parentData['fairness_score'] = $this->calculateFairness($allAdvisorLeads);

            unset($parentData['advisor_ids'], $parentData['advisor_leads']);
            foreach ($parentData['children'] as &$child) {
                unset($child['advisor_ids'], $child['advisor_leads']);
            }

            return $parentData;
        });

        $totalAdvisors = $advisors->count();
        $totalServices = $parentServices->count();
        $allFairnessScores = $servicesData->pluck('fairness_score')->filter(fn ($s) => $s !== null);
        $overallFairness = $allFairnessScores->isNotEmpty()
            ? round($allFairnessScores->avg(), 1)
            : 100;

        return response()->json([
            'services' => $servicesData,
            'summary' => [
                'total_services' => $totalServices,
                'total_advisors' => $totalAdvisors,
                'overall_fairness' => $overallFairness,
                'total_leads' => $servicesData->sum('total_leads'),
            ],
        ]);
    }

    /**
     * @param  array<int, array<int, array<string, int>>>  $leadIndex
     * @param  \Illuminate\Support\Collection  $servicePivot
     * @param  \Illuminate\Support\Collection  $advisors
     * @return array<string, mixed>
     */
    private function buildServiceData(Service $service, array $leadIndex, $servicePivot, $advisors): array
    {
        $pivotUserIds = $servicePivot->get($service->id, collect());
        $leadUserIds = collect($leadIndex[$service->id] ?? [])->keys();
        $allUserIds = $pivotUserIds->merge($leadUserIds)->unique()->values();

        $advisorData = $allUserIds->map(function ($userId) use ($service, $leadIndex, $advisors) {
            $advisor = $advisors->get($userId);
            if (! $advisor) {
                return null;
            }

            $statusCounts = $leadIndex[$service->id][$userId] ?? [];
            $totalForService = array_sum($statusCounts);

            return [
                'id' => $advisor->id,
                'name' => $advisor->name,
                'avatar' => $advisor->avatar,
                'current_lead_count' => $advisor->current_lead_count,
                'conversion_rate' => (float) $advisor->conversion_rate,
                'performance_weight' => (float) $advisor->performance_weight,
                'availability' => (bool) $advisor->availability,
                'service_lead_count' => $totalForService,
                'status_breakdown' => $statusCounts,
            ];
        })->filter()->values();

        $advisorLeadCounts = $advisorData->pluck('service_lead_count')->toArray();
        $totalLeads = array_sum($advisorLeadCounts);

        return [
            'id' => $service->id,
            'name' => $service->name,
            'country_code' => $service->country_code,
            'country_name' => $service->country_name,
            'total_leads' => $totalLeads,
            'advisors' => $advisorData,
            'fairness_score' => $this->calculateFairness($advisorLeadCounts),
            'advisor_ids' => $allUserIds->toArray(),
            'advisor_leads' => $advisorLeadCounts,
        ];
    }

    /**
     * Calculate fairness score (0-100). 100 = perfectly balanced.
     *
     * @param  array<int>  $counts
     */
    private function calculateFairness(array $counts): ?float
    {
        $counts = array_values(array_filter($counts, fn ($c) => $c !== null));

        if (count($counts) < 2) {
            return null;
        }

        $count = count($counts);
        $sum = array_sum($counts);

        // If all advisors have 0 leads, it's perfectly fair
        if ($sum === 0) {
            return 100;
        }

        $mean = $sum / $count;

        // Additional safety check for mean being zero or very close to zero
        if ($mean <= 0.0) {
            return 100;
        }

        $variance = array_sum(array_map(fn ($c) => ($c - $mean) ** 2, $counts)) / $count;

        // If variance is zero, all values are the same (perfectly balanced)
        if ($variance <= 0.0) {
            return 100;
        }

        $stdDev = sqrt($variance);

        // Safety check before division
        if ($stdDev <= 0.0 || $mean <= 0.0) {
            return 100;
        }

        $cv = $stdDev / $mean; // coefficient of variation

        return round(max(0, 100 - ($cv * 100)), 1);
    }
}
