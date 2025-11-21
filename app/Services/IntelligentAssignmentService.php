<?php

namespace App\Services;

use App\Events\LeadAssigned;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class IntelligentAssignmentService
{
    /**
     * Maximum workload per CRO
     */
    private const MAX_CRO_WORKLOAD = 50;

    /**
     * Maximum workload per Advisor
     */
    private const MAX_ADVISOR_WORKLOAD = 30;

    /**
     * Assign a new lead to a CRO using intelligent assignment logic
     */
    public function assignToCRO(Lead $lead, ?User $assignedBy = null): ?User
    {
        try {
            DB::beginTransaction();

            $cro = $this->selectBestCRO($lead);

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
     * Assign a qualified lead to an Advisor using intelligent assignment logic
     */
    public function assignToAdvisor(Lead $lead, ?User $assignedBy = null): ?User
    {
        try {
            DB::beginTransaction();

            $advisor = $this->selectBestAdvisor($lead);

            if (! $advisor) {
                Log::warning("No available Advisor found for lead {$lead->id}");

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
     * Select the best CRO for the lead
     */
    private function selectBestCRO(Lead $lead): ?User
    {
        $cros = $this->getAvailableCROs();

        if ($cros->isEmpty()) {
            return null;
        }

        return $this->selectByWeightedRoundRobin($cros, self::MAX_CRO_WORKLOAD);
    }

    /**
     * Select the best Advisor for the lead
     */
    private function selectBestAdvisor(Lead $lead): ?User
    {
        $advisors = $this->getAvailableAdvisors($lead);

        if ($advisors->isEmpty()) {
            return null;
        }

        return $this->selectByWeightedRoundRobin($advisors, self::MAX_ADVISOR_WORKLOAD);
    }

    /**
     * Get available CROs
     */
    private function getAvailableCROs()
    {
        return User::query()
            ->where('available', true)
            ->where('active', true)
            ->whereHas('roles', function ($query) {
                $query->whereIn('name', ['support-agent', 'senior-support-agent']);
            })
            ->where('current_lead_count', '<', self::MAX_CRO_WORKLOAD)
            ->with('roles')
            ->get();
    }

    /**
     * Get available Advisors with optional specialization matching
     */
    private function getAvailableAdvisors(Lead $lead)
    {
        $query = User::query()
            ->where('available', true)
            ->where('active', true)
            ->whereHas('roles', function ($query) {
                $query->where('name', 'sales-rep');
            })
            ->where('current_lead_count', '<', self::MAX_ADVISOR_WORKLOAD);

        if ($lead->service_id) {
            $advisorsWithService = (clone $query)
                ->whereHas('services', function ($q) use ($lead) {
                    $q->where('service_id', $lead->service_id)
                        ->where('service_user.status', 'active');
                })
                ->with('roles', 'services')
                ->get();

            if ($advisorsWithService->isNotEmpty()) {
                return $advisorsWithService;
            }
        }

        return $query->with('roles', 'services')->get();
    }

    /**
     * Select user by weighted round-robin algorithm
     */
    private function selectByWeightedRoundRobin($users, int $maxWorkload): ?User
    {
        if ($users->isEmpty()) {
            return null;
        }

        $scored = $users->map(function ($user) use ($maxWorkload) {
            $score = $this->calculateAssignmentScore($user, $maxWorkload);

            return [
                'user' => $user,
                'score' => $score,
            ];
        })->sortByDesc('score');

        return $scored->first()['user'];
    }

    /**
     * Calculate assignment score for a user
     */
    private function calculateAssignmentScore(User $user, int $maxWorkload): float
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
     * Calculate penalty based on how recently the user was assigned
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
     * Perform the actual assignment
     */
    private function performAssignment(Lead $lead, User $user, string $assignmentType, ?User $assignedBy): void
    {
        $statusMap = [
            'cro' => 'assigned_to_cro',
            'advisor' => 'assigned_to_advisor',
        ];

        $lead->update([
            'assigned_to' => $user->id,
            'assigned_date' => now(),
            'inquiry_status' => $statusMap[$assignmentType] ?? 'new',
        ]);

        $user->increment('current_lead_count');
        $user->increment('total_leads_assigned');
        $user->update(['last_assignment_at' => now()]);

        $this->createAssignmentActivity($lead, $user, $assignmentType, $assignedBy);

        event(new LeadAssigned($lead, $user, $assignmentType, $assignedBy));

        $this->clearAssignmentCache();
    }

    /**
     * Create activity log for assignment
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
     * Update user metrics after lead qualification
     */
    public function updateMetricsOnQualification(User $user): void
    {
        $user->increment('qualified_leads_count');

        $this->recalculateConversionRate($user);
        $this->recalculatePerformanceWeight($user);

        $user->save();
    }

    /**
     * Update user metrics after lead conversion
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
     * Update user metrics when lead is lost
     */
    public function updateMetricsOnLoss(User $user): void
    {
        $user->decrement('current_lead_count');

        $this->recalculateConversionRate($user);
        $this->recalculatePerformanceWeight($user);

        $user->save();
    }

    /**
     * Update user metrics when lead is reassigned
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
     * Recalculate conversion rate for a user
     */
    private function recalculateConversionRate(User $user): void
    {
        if ($user->total_leads_assigned === 0) {
            $user->conversion_rate = 0;

            return;
        }

        $conversionRate = ($user->converted_leads_count / $user->total_leads_assigned) * 100;
        $user->conversion_rate = min(100, round($conversionRate, 2));
    }

    /**
     * Recalculate performance weight for a user
     */
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
     * Clear assignment-related caches
     */
    private function clearAssignmentCache(): void
    {
        Cache::tags(['assignments', 'users', 'leads'])->flush();
    }

    /**
     * Get assignment statistics
     */
    public function getAssignmentStatistics(): array
    {
        return Cache::remember('assignment_statistics', now()->addMinutes(5), function () {
            $cros = User::whereHas('roles', fn ($q) => $q->whereIn('name', ['support-agent', 'senior-support-agent']))
                ->where('active', true)
                ->get();

            $advisors = User::whereHas('roles', fn ($q) => $q->where('name', 'sales-rep'))
                ->where('active', true)
                ->get();

            return [
                'cros' => [
                    'total' => $cros->count(),
                    'available' => $cros->where('available', true)->count(),
                    'current_workload' => $cros->sum('current_lead_count'),
                    'average_workload' => $cros->avg('current_lead_count'),
                    'capacity_utilization' => ($cros->sum('current_lead_count') / ($cros->count() * self::MAX_CRO_WORKLOAD)) * 100,
                ],
                'advisors' => [
                    'total' => $advisors->count(),
                    'available' => $advisors->where('available', true)->count(),
                    'current_workload' => $advisors->sum('current_lead_count'),
                    'average_workload' => $advisors->avg('current_lead_count'),
                    'capacity_utilization' => ($advisors->sum('current_lead_count') / ($advisors->count() * self::MAX_ADVISOR_WORKLOAD)) * 100,
                ],
            ];
        });
    }
}
