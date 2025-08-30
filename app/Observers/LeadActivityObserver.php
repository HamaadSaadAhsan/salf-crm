<?php

namespace App\Observers;

use App\Models\Lead;
use App\Models\LeadActivity;

class LeadActivityObserver
{
    public function created(LeadActivity $activity): void
    {
        $this->updateLeadComputedFields($activity->lead_id);
    }

    public function updated(LeadActivity $activity): void
    {
        $this->updateLeadComputedFields($activity->lead_id);

        // If lead_id changed (rare but possible), update both leads
        if ($activity->isDirty('lead_id')) {
            $this->updateLeadComputedFields($activity->getOriginal('lead_id'));
        }
    }

    public function deleted(LeadActivity $activity): void
    {
        $this->updateLeadComputedFields($activity->lead_id);
    }

    private function updateLeadComputedFields(string $leadId): void
    {
        $lead = Lead::find($leadId);
        if (!$lead) return;

        // Get next pending follow-up
        $nextFollowUp = LeadActivity::where('lead_id', $leadId)
            ->where('status', 'pending')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '>', now())
            ->orderBy('scheduled_at')
            ->first();

        // Count pending activities
        $pendingCount = LeadActivity::where('lead_id', $leadId)
            ->where('status', 'pending')
            ->count();

        // Get last activity timestamp
        $lastActivity = LeadActivity::where('lead_id', $leadId)
            ->latest('created_at')
            ->first();

        // Update lead without triggering events
        $lead->updateQuietly([
            'next_follow_up_at' => $nextFollowUp?->scheduled_at,
            'pending_activities_count' => $pendingCount,
            'last_activity_at' => $lastActivity?->created_at ?? $lead->created_at,
        ]);
    }
}
