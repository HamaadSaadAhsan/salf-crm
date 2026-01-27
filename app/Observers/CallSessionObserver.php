<?php

namespace App\Observers;

use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Support\Facades\Log;

class CallSessionObserver
{
    /**
     * Handle the CallSession "updated" event.
     */
    public function updated(CallSession $callSession): void
    {
        // Check if status changed to 'answered'
        if (! $callSession->wasChanged('status') || $callSession->status !== 'answered') {
            return;
        }

        if (! $callSession->lead_id) {
            return;
        }

        $lead = Lead::find($callSession->lead_id);
        if (! $lead) {
            return;
        }

        // Auto-set next follow-up to 1 day from now for any answered call (inbound or outbound)
        $lead->updateQuietly(['next_follow_up_at' => now()->addDay()]);

        Log::info('Lead follow-up automatically set to 1 day from now', [
            'lead_id' => $lead->id,
            'call_session_id' => $callSession->id,
            'call_direction' => $callSession->call_direction,
            'next_follow_up_at' => now()->addDay()->toDateTimeString(),
        ]);

        // Outbound-specific: update status from 'new' to 'contacted'
        if ($callSession->call_direction === 'outbound' && $lead->inquiry_status === 'new') {
            $previousStatus = $lead->inquiry_status;
            $lead->updateQuietly(['inquiry_status' => 'contacted']);

            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $callSession->caller_id ?? $lead->assigned_to,
                'type' => 'status_change',
                'status' => 'completed',
                'subject' => 'Status changed from New to Contacted',
                'description' => "Lead status was automatically updated from 'New' to 'Contacted' due to outbound call being answered.",
                'completed_at' => now(),
                'metadata' => [
                    'previous_status' => $previousStatus,
                    'new_status' => 'contacted',
                    'reason' => 'outbound_call_answered',
                    'call_session_id' => $callSession->id,
                    'session_id' => $callSession->session_id,
                ],
            ]);

            // Create follow-up task for the assignee
            $assignedUserId = $lead->assigned_to ?? $callSession->caller_id;
            if ($assignedUserId) {
                LeadActivity::create([
                    'lead_id' => $lead->id,
                    'user_id' => $assignedUserId,
                    'type' => 'follow_up',
                    'status' => 'pending',
                    'subject' => 'Follow up on contacted lead',
                    'description' => 'Lead has been contacted via outbound call. Schedule follow-up call or meeting to continue the conversation.',
                    'scheduled_at' => now()->addDays(2),
                    'due_at' => now()->addDays(3),
                    'priority' => $lead->priority === 'urgent' ? 'urgent' : 'medium',
                    'category' => 'follow_up',
                    'metadata' => [
                        'triggered_by' => 'outbound_call_answered',
                        'call_session_id' => $callSession->id,
                        'session_id' => $callSession->session_id,
                    ],
                ]);
            }

            Log::info('Lead status automatically updated to contacted (outbound call)', [
                'lead_id' => $lead->id,
                'previous_status' => $previousStatus,
                'call_session_id' => $callSession->id,
                'call_direction' => 'outbound',
            ]);
        }
    }
}
