<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CROAssignmentService
{
    /**
     * Find and assign the best matching CRO for a new lead.
     *
     * @param Lead|null $lead Optional lead for context (service, city, etc.)
     * @return User|null The assigned CRO, or null if no match found
     */
    public function assignCROToLead(?Lead $lead = null): ?User
    {
        // Get all active CROs
        // CROs: support-agent, senior-support-agent
        // Advisors: sales-rep, senior-sales-rep (excluded here)
        // Admin roles: super-admin, admin, manager, team-lead (excluded - admins should not be auto-assigned leads)
        $cros = User::whereHas('roles', function ($query) {
            $query->whereIn('name', ['support-agent', 'senior-support-agent']);
        })
            ->whereDoesntHave('roles', function ($query) {
                // Exclude admin roles - admins should not be auto-assigned leads
                $query->whereIn('name', ['super-admin', 'admin', 'manager', 'team-lead']);
            })
            ->where('availability', true)
            ->with(['roles'])
            ->get();

        if ($cros->isEmpty()) {
            Log::warning('No available CROs found for lead assignment');

            return null;
        }

        // Calculate fair assignment score for each CRO
        $scoredCROs = $cros->map(function ($cro) use ($lead) {
            return [
                'user' => $cro,
                'score' => $this->calculateCROScore($cro, $lead),
            ];
        });

        // Sort by score (lower is better for fair distribution)
        $bestCRO = $scoredCROs->sortBy('score')->first();

        Log::info('CRO assigned to lead', [
            'lead_id' => $lead?->id,
            'cro_id' => $bestCRO['user']->id,
            'cro_name' => $bestCRO['user']->name,
            'score' => $bestCRO['score'],
            'total_cros' => $cros->count(),
        ]);

        return $bestCRO['user'];
    }

    /**
     * Calculate fairness score for CRO assignment.
     * Lower score = better candidate for assignment.
     *
     * @param User $cro
     * @param Lead|null $lead
     * @return float
     */
    private function calculateCROScore(User $cro, ?Lead $lead): float
    {
        $score = 0.0;

        // 1. Current lead count (weight: 50%)
        // CROs with fewer leads get priority
        $currentLeadCount = $cro->current_lead_count ?? 0;
        $score += $currentLeadCount * 0.5;

        // 2. Lead count for this specific service (weight: 30%)
        // Distribute leads evenly across programs
        if ($lead && $lead->service_id) {
            $serviceLeadCount = Lead::where('assigned_to', $cro->id)
                ->where('service_id', $lead->service_id)
                ->whereIn('inquiry_status', ['new', 'assigned_to_cro', 'contacted', 'requalify'])
                ->count();
            $score += $serviceLeadCount * 0.3;
        }

        // 3. Time since last assignment (weight: 15%)
        // Round-robin: CROs who haven't received leads recently get priority
        if ($cro->last_assignment_at) {
            $hoursSinceLastAssignment = now()->diffInHours($cro->last_assignment_at);
            // Subtract hours (more hours = lower score = better)
            $score -= min($hoursSinceLastAssignment, 168) * 0.0015; // Cap at 1 week
        } else {
            // Never assigned = highest priority
            $score -= 100;
        }

        // 4. Performance weight (weight: 5%)
        // Higher performance weight = slightly better (but minor factor)
        $performanceWeight = $cro->performance_weight ?? 1.0;
        $score -= ($performanceWeight - 1.0) * 0.05;

        return $score;
    }

    /**
     * Assign CRO to lead and update lead status.
     *
     * @param Lead $lead
     * @return bool True if assignment was successful
     */
    public function assignCRO(Lead $lead): bool
    {
        $cro = $this->assignCROToLead($lead);

        if (! $cro) {
            return false;
        }

        // Update lead assignment
        $lead->assigned_to = $cro->id;
        $lead->assigned_date = now();
        $lead->save();

        // Update CRO's lead count
        $cro->increment('current_lead_count');
        $cro->update(['last_assignment_at' => now()]);

        return true;
    }
}
