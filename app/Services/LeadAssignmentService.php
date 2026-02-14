<?php

namespace App\Services;

use App\Events\AssignmentQueueUpdated;
use App\Events\LeadAssigned;
use App\Models\City;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\LeadServiceAssignment;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeadAssignmentService
{
    private const MAX_CRO_WORKLOAD = 50;

    private const MAX_ADVISOR_WORKLOAD = 30;

    /**
     * Assign a new lead to a CRO using intelligent assignment logic.
     */
    public function assignToCRO(Lead $lead, ?User $assignedBy = null): ?User
    {
        try {
            DB::beginTransaction();

            $cro = $this->selectBestCRO();

            if (! $cro) {
                Log::warning("No available CRO found for lead {$lead->id}");

                return null;
            }

            $this->performAssignment($lead, $cro, 'cro', $assignedBy);

            DB::commit();

            return $cro;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error assigning lead {$lead->id} to CRO: ".$e->getMessage());

            return null;
        }
    }

    /**
     * Assign a qualified lead to an Advisor using hierarchy-aware matching.
     */
    public function assignToAdvisor(Lead $lead, ?User $assignedBy = null): ?User
    {
        // Skip if already assigned to an advisor
        if ($lead->inquiry_status === 'assigned_to_advisor') {
            Log::info("Lead {$lead->id} already assigned to advisor, skipping");

            return null;
        }

        try {
            DB::beginTransaction();

            $advisor = $this->selectBestAdvisor($lead);

            if (! $advisor) {
                Log::warning('No available advisor found for lead', [
                    'lead_id' => $lead->id,
                    'service_id' => $lead->service_id,
                    'city' => $lead->city,
                ]);

                return null;
            }

            $this->performAssignment($lead, $advisor, 'advisor', $assignedBy);

            DB::commit();

            return $advisor;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error assigning lead {$lead->id} to Advisor: ".$e->getMessage());

            return null;
        }
    }

    /**
     * Select the best CRO for a lead.
     */
    private function selectBestCRO(): ?User
    {
        $cros = User::query()
            ->where('availability', true)
            ->where('active', true)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['support-agent', 'senior-support-agent']))
            ->where('current_lead_count', '<', self::MAX_CRO_WORKLOAD)
            ->with('roles')
            ->get();

        if ($cros->isEmpty()) {
            return null;
        }

        return $this->selectByWeightedRoundRobin($cros, self::MAX_CRO_WORKLOAD);
    }

    /**
     * Select the best Advisor for a lead using city/zone/hierarchy matching.
     */
    private function selectBestAdvisor(Lead $lead): ?User
    {
        $advisors = $this->getAvailableAdvisors($lead);

        if ($advisors->isEmpty()) {
            return null;
        }

        // Get the service for scoring
        $service = $lead->service_id ? Service::with(['parent', 'children'])->find($lead->service_id) : null;

        // Score advisors (lower score = better candidate)
        $scoredAdvisors = $advisors->map(fn ($advisor) => [
            'user' => $advisor,
            'score' => $this->calculateAdvisorScore($advisor, $service, $lead),
        ]);

        return $scoredAdvisors->sortBy('score')->first()['user'];
    }

    /**
     * Get available advisors with hierarchical service + city/zone matching.
     *
     * Fallback chain:
     * 1. Service + City/Zone match
     * 2. City/Zone match only
     * 3. Service match only
     * 4. Any available advisor
     */
    private function getAvailableAdvisors(Lead $lead): Collection
    {
        // Build hierarchy-aware service IDs
        $serviceIds = [];
        if ($lead->service_id) {
            $service = Service::with(['parent', 'children'])->find($lead->service_id);
            if ($service) {
                $serviceIds = $this->buildServiceIdsForMatching($service);
            }
        }

        // Resolve city to zone
        $city = null;
        if ($lead->city) {
            $city = City::whereRaw('LOWER(name) = LOWER(?)', [trim($lead->city)])
                ->where('is_active', true)
                ->first();
        }

        // Base query: available advisors with sales-rep or senior-sales-rep role
        $baseQuery = User::query()
            ->where('availability', true)
            ->where('active', true)
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['sales-rep', 'senior-sales-rep']))
            ->whereDoesntHave('roles', fn ($q) => $q->whereIn('name', ['super-admin', 'admin', 'manager', 'team-lead']))
            ->where('current_lead_count', '<', self::MAX_ADVISOR_WORKLOAD);

        // 1. Service + City/Zone match (most specific)
        if (! empty($serviceIds) && $city) {
            $advisors = (clone $baseQuery)
                ->whereHas('services', fn ($q) => $q->whereIn('services.id', $serviceIds)->where('service_user.status', 'active'))
                ->whereHas('zone', fn ($q) => $q->whereHas('cities', fn ($cq) => $cq->where('cities.id', $city->id)))
                ->with(['zone', 'services'])
                ->get();

            if ($advisors->isNotEmpty()) {
                return $advisors;
            }
        }

        // 2. City/Zone match only
        if ($city) {
            $advisors = (clone $baseQuery)
                ->whereHas('zone', fn ($q) => $q->whereHas('cities', fn ($cq) => $cq->where('cities.id', $city->id)))
                ->with(['zone', 'services'])
                ->get();

            if ($advisors->isNotEmpty()) {
                return $advisors;
            }
        }

        // 3. Service match only (no zone filter)
        if (! empty($serviceIds)) {
            $advisors = (clone $baseQuery)
                ->whereHas('services', fn ($q) => $q->whereIn('services.id', $serviceIds)->where('service_user.status', 'active'))
                ->with(['zone', 'services'])
                ->get();

            if ($advisors->isNotEmpty()) {
                return $advisors;
            }
        }

        // 4. Last resort: any available advisor
        return $baseQuery->with(['zone', 'services'])->get();
    }

    /**
     * Build hierarchy-aware service IDs for matching.
     *
     * If service is a child: match itself + parent
     * If service is a parent: match itself + all children
     *
     * @return array<int>
     */
    private function buildServiceIdsForMatching(Service $service): array
    {
        $serviceIds = [$service->id];

        // Child → Parent: if service has a parent, include parent
        if ($service->parent_id) {
            $serviceIds[] = $service->parent_id;
        }

        // Parent → Children: if service IS a parent, include all children
        $childIds = $service->children->pluck('id')->toArray();
        $serviceIds = array_merge($serviceIds, $childIds);

        return array_unique($serviceIds);
    }

    /**
     * Calculate fairness score for advisor assignment.
     * Lower score = better candidate for assignment.
     */
    private function calculateAdvisorScore(User $advisor, ?Service $service, Lead $lead): float
    {
        $score = 0.0;

        // 1. Service match priority (weight: 20%)
        // Prefer exact service match over parent/child match
        if ($service) {
            $hasExactMatch = $advisor->services->contains('id', $service->id);
            $score += $hasExactMatch ? 0 : 20;
        }

        // 2. Current lead count (weight: 35%)
        $currentLeadCount = $advisor->current_lead_count ?? 0;
        $score += $currentLeadCount * 0.35;

        // 3. Lead count for this specific service (weight: 30%)
        if ($service) {
            $serviceLeadCount = Lead::where('assigned_to', $advisor->id)
                ->where('service_id', $service->id)
                ->whereIn('inquiry_status', ['assigned_to_advisor', 'qualified'])
                ->count();
            $score += $serviceLeadCount * 0.30;
        }

        // 4. Time since last assignment (weight: 10%)
        if ($advisor->last_assignment_at) {
            $hoursSinceLastAssignment = now()->diffInHours($advisor->last_assignment_at);
            $score -= min($hoursSinceLastAssignment, 168) * 0.001;
        } else {
            $score -= 50;
        }

        // 5. Performance weight (weight: 5%)
        $performanceWeight = $advisor->performance_weight ?? 1.0;
        $score -= ($performanceWeight - 1.0) * 0.05;

        return $score;
    }

    /**
     * Select user by weighted round-robin (for CRO assignment).
     */
    private function selectByWeightedRoundRobin(Collection $users, int $maxWorkload): ?User
    {
        if ($users->isEmpty()) {
            return null;
        }

        $scored = $users->map(fn ($user) => [
            'user' => $user,
            'score' => $this->calculateCROScore($user, $maxWorkload),
        ])->sortByDesc('score');

        return $scored->first()['user'];
    }

    /**
     * Calculate CRO assignment score (higher = better candidate).
     */
    private function calculateCROScore(User $user, int $maxWorkload): float
    {
        $baseScore = 100;

        $workloadPenalty = ($user->current_lead_count / $maxWorkload) * 40;
        $baseScore -= $workloadPenalty;

        $performanceBonus = ($user->performance_weight - 1.0) * 20;
        $baseScore += $performanceBonus;

        $conversionBonus = min(20, $user->conversion_rate);
        $baseScore += $conversionBonus;

        $recencyPenalty = $this->calculateRecencyPenalty($user);
        $baseScore -= $recencyPenalty;

        return max(0, $baseScore);
    }

    /**
     * Calculate penalty based on how recently the user was assigned.
     */
    private function calculateRecencyPenalty(User $user): float
    {
        if (! $user->last_assignment_at) {
            return 0;
        }

        $minutesSinceAssignment = now()->diffInMinutes($user->last_assignment_at);

        if ($minutesSinceAssignment < 5) {
            return 30;
        }

        if ($minutesSinceAssignment < 15) {
            return 15;
        }

        if ($minutesSinceAssignment < 30) {
            return 5;
        }

        return 0;
    }

    /**
     * Perform the actual assignment with event dispatching and tracking.
     */
    private function performAssignment(Lead $lead, User $user, string $assignmentType, ?User $assignedBy): void
    {
        $statusMap = [
            'cro' => 'assigned_to_cro',
            'advisor' => 'assigned_to_advisor',
        ];

        $updateData = [
            'assigned_to' => $user->id,
            'assigned_date' => now(),
            'inquiry_status' => $statusMap[$assignmentType] ?? 'new',
        ];

        if ($assignmentType === 'advisor') {
            $updateData['advisor_stage'] = 'new';
        }

        $lead->update($updateData);

        $user->increment('current_lead_count');
        $user->increment('total_leads_assigned');
        $user->update(['last_assignment_at' => now()]);

        $this->trackServiceAssignment($lead, $user);
        $this->createAssignmentActivity($lead, $user, $assignmentType, $assignedBy);

        event(new LeadAssigned($lead, $user, $assignmentType, $assignedBy));
        event(new AssignmentQueueUpdated('lead_assigned'));

        $this->clearAssignmentCache();
    }

    /**
     * Track service assignments for hierarchical service reporting.
     */
    private function trackServiceAssignment(Lead $lead, User $user): void
    {
        if (! $lead->service_id) {
            return;
        }

        $service = Service::find($lead->service_id);

        if (! $service) {
            return;
        }

        $children = $service->children()->get();

        if ($children->isNotEmpty()) {
            // Parent service: create records for parent and all children
            LeadServiceAssignment::updateOrCreate(
                ['lead_id' => $lead->id, 'service_id' => $service->id, 'user_id' => $user->id],
                ['is_parent_service' => true, 'parent_service_id' => null, 'assigned_at' => now()]
            );

            foreach ($children as $child) {
                LeadServiceAssignment::updateOrCreate(
                    ['lead_id' => $lead->id, 'service_id' => $child->id, 'user_id' => $user->id],
                    ['is_parent_service' => false, 'parent_service_id' => $service->id, 'assigned_at' => now()]
                );
            }
        } else {
            // Child or standalone service
            LeadServiceAssignment::updateOrCreate(
                ['lead_id' => $lead->id, 'service_id' => $service->id, 'user_id' => $user->id],
                ['is_parent_service' => false, 'parent_service_id' => $service->parent_id, 'assigned_at' => now()]
            );
        }
    }

    /**
     * Create activity log for assignment.
     */
    private function createAssignmentActivity(Lead $lead, User $user, string $assignmentType, ?User $assignedBy): void
    {
        $assignmentTypeLabel = match ($assignmentType) {
            'cro' => 'CRO',
            'advisor' => 'Advisor',
            default => 'User'
        };

        $assignedByText = $assignedBy ? " by {$assignedBy->name}" : ' automatically';

        LeadActivity::create([
            'lead_id' => $lead->id,
            'user_id' => $user->id,
            'type' => 'assignment_change',
            'status' => 'completed',
            'subject' => "Assigned to {$assignmentTypeLabel}",
            'description' => "Lead was assigned to {$assignmentTypeLabel} {$user->name}{$assignedByText}.",
            'completed_at' => now(),
            'category' => 'system',
            'metadata' => [
                'assignment_type' => $assignmentType,
                'assigned_to_id' => $user->id,
                'assigned_to_name' => $user->name,
                'assigned_by_id' => $assignedBy?->id,
                'assigned_by_name' => $assignedBy?->name,
                'workload' => $user->current_lead_count,
            ],
        ]);

        LeadActivity::create([
            'lead_id' => $lead->id,
            'user_id' => $user->id,
            'type' => 'task',
            'status' => 'pending',
            'subject' => 'Review and contact new lead',
            'description' => "You have been assigned a new lead: {$lead->name}. Please review the lead details and make initial contact within 24 hours.",
            'scheduled_at' => now()->addHour(),
            'due_at' => now()->addDay(),
            'priority' => $lead->priority === 'urgent' ? 'urgent' : ($lead->priority === 'high' ? 'high' : 'medium'),
            'category' => 'follow_up',
            'metadata' => [
                'change_type' => 'assignment_task',
                'assigned_by' => $assignedBy?->id,
            ],
        ]);
    }

    /**
     * Update user metrics after lead qualification.
     */
    public function updateMetricsOnQualification(User $user): void
    {
        $user->increment('qualified_leads_count');

        $this->recalculateConversionRate($user);
        $this->recalculatePerformanceWeight($user);

        $user->save();
    }

    /**
     * Update user metrics after lead conversion.
     */
    public function updateMetricsOnConversion(User $user): void
    {
        $user->increment('converted_leads_count');
        $user->decrement('current_lead_count');

        $this->recalculateConversionRate($user);
        $this->recalculatePerformanceWeight($user);

        $user->save();
    }

    /**
     * Update user metrics when lead is lost.
     */
    public function updateMetricsOnLoss(User $user): void
    {
        $user->decrement('current_lead_count');

        $this->recalculateConversionRate($user);
        $this->recalculatePerformanceWeight($user);

        $user->save();
    }

    /**
     * Update user metrics when lead is reassigned.
     */
    public function updateMetricsOnReassignment(User $oldUser, User $newUser): void
    {
        $oldUser->decrement('current_lead_count');
        $oldUser->save();

        $newUser->increment('current_lead_count');
        $newUser->increment('total_leads_assigned');
        $newUser->update(['last_assignment_at' => now()]);
    }

    /**
     * Get assignment statistics.
     */
    public function getAssignmentStatistics(): array
    {
        return Cache::remember('assignment_statistics', now()->addMinutes(5), function () {
            $cros = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['support-agent', 'senior-support-agent']))
                ->where('active', true)
                ->get();

            $advisors = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['sales-rep', 'senior-sales-rep']))
                ->where('active', true)
                ->get();

            return [
                'cros' => [
                    'total' => $cros->count(),
                    'available' => $cros->where('availability', true)->count(),
                    'current_workload' => $cros->sum('current_lead_count'),
                    'average_workload' => $cros->avg('current_lead_count'),
                    'capacity_utilization' => $cros->count() > 0
                        ? ($cros->sum('current_lead_count') / ($cros->count() * self::MAX_CRO_WORKLOAD)) * 100
                        : 0,
                ],
                'advisors' => [
                    'total' => $advisors->count(),
                    'available' => $advisors->where('availability', true)->count(),
                    'current_workload' => $advisors->sum('current_lead_count'),
                    'average_workload' => $advisors->avg('current_lead_count'),
                    'capacity_utilization' => $advisors->count() > 0
                        ? ($advisors->sum('current_lead_count') / ($advisors->count() * self::MAX_ADVISOR_WORKLOAD)) * 100
                        : 0,
                ],
            ];
        });
    }

    private function recalculateConversionRate(User $user): void
    {
        if ($user->total_leads_assigned === 0) {
            $user->conversion_rate = 0;

            return;
        }

        $conversionRate = ($user->converted_leads_count / $user->total_leads_assigned) * 100;
        $user->conversion_rate = min(100, round($conversionRate, 2));
    }

    private function recalculatePerformanceWeight(User $user): void
    {
        $baseWeight = 1.0;

        if ($user->conversion_rate >= 30) {
            $baseWeight = 1.5;
        } elseif ($user->conversion_rate >= 20) {
            $baseWeight = 1.3;
        } elseif ($user->conversion_rate >= 10) {
            $baseWeight = 1.1;
        } elseif ($user->conversion_rate < 5 && $user->total_leads_assigned > 10) {
            $baseWeight = 0.8;
        }

        if ($user->qualified_leads_count > 50) {
            $baseWeight += 0.1;
        }

        $user->performance_weight = min(2.0, $baseWeight);
    }

    /**
     * Clear assignment-related caches.
     */
    private function clearAssignmentCache(): void
    {
        try {
            Cache::tags(['assignments', 'users', 'leads'])->flush();
        } catch (\BadMethodCallException) {
            // Cache driver doesn't support tags (e.g., file, array)
            Cache::flush();
        }
    }
}
