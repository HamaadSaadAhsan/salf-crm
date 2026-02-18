<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Service;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserPerformanceController extends Controller
{
    private const MAX_CRO_WORKLOAD = 50;

    private const CRO_ROLES = ['support-agent', 'senior-support-agent'];

    private const ADVISOR_ROLES = ['sales-rep', 'senior-sales-rep'];

    public function show(Request $request, User $user): JsonResponse
    {
        $authUser = auth()->user();
        $isOwnProfile = $authUser->id === $user->id;
        $isSuperAdmin = $authUser->hasRole('super-admin');

        if (! $isSuperAdmin && ! $isOwnProfile) {
            if ($authUser->hasPermissionTo('manage team agents')) {
                $subordinateRole = match (true) {
                    $authUser->hasRole('senior-support-agent') => 'support-agent',
                    $authUser->hasRole('senior-sales-rep') => 'sales-rep',
                    default => null,
                };
                abort_unless(
                    $subordinateRole && $user->hasRole($subordinateRole),
                    403,
                    'Unauthorized to view this performance board.'
                );
            } else {
                abort(403, 'Unauthorized to view this performance board.');
            }
        }

        $filters = $request->only(['date_from', 'date_to', 'service_id']);

        if ($user->hasAnyRole(self::CRO_ROLES)) {
            return response()->json([
                'role_type' => 'cro',
                'metrics' => $this->getCroMetrics($user, $filters),
            ]);
        }

        if ($user->hasAnyRole(self::ADVISOR_ROLES)) {
            return response()->json([
                'role_type' => 'advisor',
                'metrics' => $this->getAdvisorMetrics($user, $filters),
            ]);
        }

        return response()->json([
            'role_type' => 'other',
            'metrics' => [],
        ]);
    }

    /**
     * Apply date range and service filters to a lead query.
     *
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(EloquentBuilder $query, array $filters): EloquentBuilder
    {
        if (! empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (! empty($filters['service_id'])) {
            $serviceIds = Service::where('id', $filters['service_id'])
                ->orWhere('parent_id', $filters['service_id'])
                ->pluck('id');

            $query->whereIn('service_id', $serviceIds);
        }

        return $query;
    }

    /**
     * Create a filtered base query for leads.
     *
     * @param  array<string, mixed>  $filters
     */
    private function filteredLeadQuery(string $column, int $userId, array $filters): EloquentBuilder
    {
        return $this->applyFilters(Lead::where($column, $userId), $filters);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function getCroMetrics(User $user, array $filters): array
    {
        $qualifiedCount = $this->filteredLeadQuery('qualified_by', $user->id, $filters)
            ->whereNotNull('qualified_at')
            ->count();

        $contactedCount = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->whereNotNull('first_cro_contact_at')
            ->count();

        $qtcRatio = $contactedCount > 0
            ? round(($qualifiedCount / $contactedCount) * 100, 1)
            : 0;

        $currentLeadCount = $user->current_lead_count ?? 0;
        $capacityPercentage = round(($currentLeadCount / self::MAX_CRO_WORKLOAD) * 100, 1);

        $requalificationScore = $this->filteredLeadQuery('qualified_by', $user->id, $filters)
            ->where('inquiry_status', '!=', 'requalify')
            ->whereNotNull('requalified_from_advisor_id')
            ->where('qualified_at', '>', DB::raw('created_at'))
            ->count();

        $totalQualified = $this->filteredLeadQuery('qualified_by', $user->id, $filters)->count();
        $wonCount = $this->filteredLeadQuery('qualified_by', $user->id, $filters)
            ->where('inquiry_status', 'won')
            ->count();

        $ltsRatio = $totalQualified > 0
            ? round(($wonCount / $totalQualified) * 100, 1)
            : 0;

        $totalAssignedCro = $this->filteredLeadQuery('assigned_to', $user->id, $filters)->count();
        $openCount = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->whereNotIn('inquiry_status', ['won', 'lost'])
            ->count();
        $lostCount = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->where('inquiry_status', 'lost')
            ->count();

        $openRatio = $totalAssignedCro > 0
            ? round(($openCount / $totalAssignedCro) * 100, 1)
            : 0;

        $lostRatio = $totalAssignedCro > 0
            ? round(($lostCount / $totalAssignedCro) * 100, 1)
            : 0;

        $firstResponseTime = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->whereNotNull('first_cro_contact_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (first_cro_contact_at - created_at)) / 60) as avg_minutes')
            ->value('avg_minutes');

        $dueTaskQuery = fn () => Task::whereNotNull('due_at')
            ->whereNull('deleted_at')
            ->whereNull('completed_at')
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->where(function (EloquentBuilder $q) use ($user) {
                $q->where('assigned_to_id', $user->id)
                    ->orWhere(function (EloquentBuilder $q2) use ($user) {
                        $q2->where('taskable_type', Lead::class)
                            ->whereIn('taskable_id', Lead::where('assigned_to', $user->id)->select('id'));
                    });
            });

        $pendingFollowUps = $dueTaskQuery()->count();

        $overdueFollowUps = $dueTaskQuery()
            ->where('due_at', '<', now())
            ->count();

        return [
            'qtc_ratio' => $qtcRatio,
            'capacity' => [
                'current' => $currentLeadCount,
                'max' => self::MAX_CRO_WORKLOAD,
                'percentage' => min($capacityPercentage, 100),
            ],
            'requalification_score' => $requalificationScore,
            'lts_ratio' => $ltsRatio,
            'total_assigned' => $totalAssignedCro,
            'otc_open_ratio' => $openRatio,
            'otc_lost_ratio' => $lostRatio,
            'pending_follow_ups' => $pendingFollowUps,
            'overdue_follow_ups' => $overdueFollowUps,
            'first_response_time' => $firstResponseTime !== null ? round((float) $firstResponseTime, 1) : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function getAdvisorMetrics(User $user, array $filters): array
    {
        $performanceWeight = $user->performance_weight ?? 1.0;

        $totalAssigned = $this->filteredLeadQuery('assigned_to', $user->id, $filters)->count();
        $requalifiedCount = $this->filteredLeadQuery('requalified_from_advisor_id', $user->id, $filters)->count();

        $requalifyPercentage = $totalAssigned > 0
            ? round(($requalifiedCount / $totalAssigned) * 100, 1)
            : 0;

        $wonCount = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->where('inquiry_status', 'won')
            ->count();

        $ltsRatio = $totalAssigned > 0
            ? round(($wonCount / $totalAssigned) * 100, 1)
            : 0;

        $openCount = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->whereNotIn('inquiry_status', ['won', 'lost'])
            ->count();
        $lostCount = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->where('inquiry_status', 'lost')
            ->count();

        $openRatio = $totalAssigned > 0
            ? round(($openCount / $totalAssigned) * 100, 1)
            : 0;
        $lostRatio = $totalAssigned > 0
            ? round(($lostCount / $totalAssigned) * 100, 1)
            : 0;

        $firstResponseTime = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->whereNotNull('advisor_first_contact_at')
            ->whereNotNull('qualified_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (advisor_first_contact_at - qualified_at)) / 60) as avg_minutes')
            ->value('avg_minutes');

        $avgLifecycleDays = $this->filteredLeadQuery('assigned_to', $user->id, $filters)
            ->where('inquiry_status', 'won')
            ->whereNotNull('converted_at')
            ->selectRaw('AVG(EXTRACT(EPOCH FROM (converted_at - created_at)) / 86400) as avg_days')
            ->value('avg_days');

        $dueTaskQuery = fn () => Task::whereNotNull('due_at')
            ->whereNull('deleted_at')
            ->whereNull('completed_at')
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->where(function (EloquentBuilder $q) use ($user) {
                $q->where('assigned_to_id', $user->id)
                    ->orWhere(function (EloquentBuilder $q2) use ($user) {
                        $q2->where('taskable_type', Lead::class)
                            ->whereIn('taskable_id', Lead::where('assigned_to', $user->id)->select('id'));
                    });
            });

        $pendingFollowUps = $dueTaskQuery()->count();

        $overdueFollowUps = $dueTaskQuery()
            ->where('due_at', '<', now())
            ->count();

        return [
            'performance_score' => round((float) $performanceWeight, 2),
            'requalify_percentage' => $requalifyPercentage,
            'lts_ratio' => $ltsRatio,
            'total_assigned' => $totalAssigned,
            'otc_open_ratio' => $openRatio,
            'otc_lost_ratio' => $lostRatio,
            'pending_follow_ups' => $pendingFollowUps,
            'overdue_follow_ups' => $overdueFollowUps,
            'first_response_time' => $firstResponseTime !== null ? round((float) $firstResponseTime, 1) : null,
            'avg_lifecycle_days' => $avgLifecycleDays !== null ? round((float) $avgLifecycleDays, 1) : null,
        ];
    }
}
