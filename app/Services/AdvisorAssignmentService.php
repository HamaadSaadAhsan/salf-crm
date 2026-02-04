<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class AdvisorAssignmentService
{
    /**
     * Find and assign the best matching advisor for a qualified lead.
     *
     * @return User|null The assigned advisor, or null if no match found
     */
    public function assignAdvisorToLead(Lead $lead): ?User
    {
        // Only assign if lead has service and city
        if (! $lead->service_id || ! $lead->city) {
            Log::info('Lead missing service or city for advisor assignment', [
                'lead_id' => $lead->id,
                'has_service' => ! is_null($lead->service_id),
                'has_city' => ! empty($lead->city),
            ]);

            return null;
        }

        // Get the service and its parent (if exists)
        $service = Service::with('parent')->find($lead->service_id);
        if (! $service) {
            Log::warning('Lead service not found', ['lead_id' => $lead->id, 'service_id' => $lead->service_id]);

            return null;
        }

        // Build service IDs to match (service itself + parent if exists)
        $serviceIds = [$service->id];
        if ($service->parent_id) {
            $serviceIds[] = $service->parent_id;
        }

        // Find city by name (case-insensitive)
        $cityName = trim($lead->city);
        $city = \App\Models\City::whereRaw('LOWER(name) = LOWER(?)', [$cityName])
            ->where('is_active', true)
            ->first();

        if (! $city) {
            Log::info('Lead city not found in database', [
                'lead_id' => $lead->id,
                'city_name' => $cityName,
            ]);

            return null;
        }

        // Find advisors matching:
        // 1. Assigned to one of the service IDs (service or parent)
        // 2. Zone contains the lead's city
        // 3. Availability is true
        // 4. Has advisor role (sales-rep, senior-sales-rep are advisors)
        // 5. Does NOT have admin roles (super-admin, admin, manager, team-lead)
        // Note: CROs are 'support-agent' and 'senior-support-agent' - they are NOT advisors
        $advisors = User::whereHas('services', function ($query) use ($serviceIds) {
            $query->whereIn('services.id', $serviceIds)
                ->wherePivot('status', 'active');
        })
            ->whereHas('zone', function ($query) use ($city) {
                $query->whereHas('cities', function ($q) use ($city) {
                    $q->where('cities.id', $city->id);
                });
            })
            ->where('availability', true)
            ->whereHas('roles', function ($query) {
                // Advisors: sales-rep, senior-sales-rep
                // CROs: support-agent, senior-support-agent (excluded here)
                $query->whereIn('name', ['sales-rep', 'senior-sales-rep']);
            })
            ->whereDoesntHave('roles', function ($query) {
                // Exclude admin roles - admins should not be auto-assigned leads
                $query->whereIn('name', ['super-admin', 'admin', 'manager', 'team-lead']);
            })
            ->with(['zone', 'services'])
            ->get();

        if ($advisors->isEmpty()) {
            Log::info('No matching advisors found for lead', [
                'lead_id' => $lead->id,
                'service_id' => $lead->service_id,
                'service_name' => $service->name,
                'city' => $cityName,
                'service_ids_checked' => $serviceIds,
            ]);

            return null;
        }

        // Calculate fair assignment score for each advisor
        $scoredAdvisors = $advisors->map(function ($advisor) use ($service, $lead) {
            return [
                'user' => $advisor,
                'score' => $this->calculateAdvisorScore($advisor, $service, $lead),
            ];
        });

        // Sort by score (lower is better for fair distribution)
        $bestAdvisor = $scoredAdvisors->sortBy('score')->first()['user'];

        $bestAdvisorData = $scoredAdvisors->where('user.id', $bestAdvisor->id)->first();

        Log::info('Advisor assigned to lead', [
            'lead_id' => $lead->id,
            'advisor_id' => $bestAdvisor->id,
            'advisor_name' => $bestAdvisor->name,
            'service_id' => $lead->service_id,
            'city' => $cityName,
            'zone_id' => $bestAdvisor->zone_id,
            'total_matches' => $advisors->count(),
            'assignment_score' => $bestAdvisorData['score'] ?? null,
            'current_lead_count' => $bestAdvisor->current_lead_count ?? 0,
        ]);

        return $bestAdvisor;
    }

    /**
     * Calculate fairness score for advisor assignment.
     * Lower score = better candidate for assignment.
     */
    private function calculateAdvisorScore(User $advisor, Service $service, Lead $lead): float
    {
        $score = 0.0;

        // 1. Service match priority (weight: 20%)
        // Prefer exact service match over parent service match
        $hasExactMatch = $advisor->services->contains('id', $service->id);
        $score += $hasExactMatch ? 0 : 20;

        // 2. Current lead count (weight: 35%)
        // Advisors with fewer total leads get priority
        $currentLeadCount = $advisor->current_lead_count ?? 0;
        $score += $currentLeadCount * 0.35;

        // 3. Lead count for this specific service (weight: 30%)
        // Distribute leads evenly across programs/services
        $serviceLeadCount = Lead::where('assigned_to', $advisor->id)
            ->where('service_id', $service->id)
            ->whereIn('inquiry_status', ['assigned_to_advisor', 'qualified'])
            ->count();
        $score += $serviceLeadCount * 0.30;

        // 4. Time since last assignment (weight: 10%)
        // Round-robin: Advisors who haven't received leads recently get priority
        if ($advisor->last_assignment_at) {
            $hoursSinceLastAssignment = now()->diffInHours($advisor->last_assignment_at);
            // Subtract hours (more hours = lower score = better)
            $score -= min($hoursSinceLastAssignment, 168) * 0.001; // Cap at 1 week
        } else {
            // Never assigned = highest priority
            $score -= 50;
        }

        // 5. Performance weight (weight: 5%)
        // Higher performance weight = slightly better (but minor factor)
        $performanceWeight = $advisor->performance_weight ?? 1.0;
        $score -= ($performanceWeight - 1.0) * 0.05;

        return $score;
    }

    /**
     * Assign advisor to lead and update lead status.
     *
     * @return bool True if assignment was successful
     */
    public function assignAdvisor(Lead $lead): bool
    {
        $advisor = $this->assignAdvisorToLead($lead);

        if (! $advisor) {
            return false;
        }

        // Update lead assignment
        $lead->assigned_to = $advisor->id;
        $lead->assigned_date = now();
        $lead->inquiry_status = 'assigned_to_advisor';
        $lead->advisor_stage = 'new';
        $lead->qualified_by = auth()->id();
        $lead->qualified_at = now();
        $lead->save();

        // Update advisor's lead count
        $advisor->increment('current_lead_count');
        $advisor->update(['last_assignment_at' => now()]);

        return true;
    }
}
