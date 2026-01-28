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
        $followUpDate = now()->addDay();
        $lead->updateQuietly(['next_follow_up_at' => $followUpDate]);

        // Create follow-up activity for all answered calls
        $assignedUserId = $lead->assigned_to ?? $callSession->caller_id;
        if ($assignedUserId) {
            $callDirection = $callSession->call_direction === 'inbound' ? 'inbound' : 'outbound';

            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $assignedUserId,
                'type' => 'follow_up',
                'status' => 'pending',
                'subject' => 'Follow up after '.$callDirection.' call',
                'description' => 'Automatic follow-up scheduled after '.$callDirection.' call was answered.',
                'scheduled_at' => $followUpDate,
                'due_at' => $followUpDate->copy()->addDay(),
                'priority' => $lead->priority === 'urgent' ? 'urgent' : 'medium',
                'category' => 'follow_up',
                'metadata' => [
                    'triggered_by' => $callDirection.'_call_answered',
                    'call_session_id' => $callSession->id,
                    'session_id' => $callSession->session_id,
                ],
            ]);
        }

        Log::info('Lead follow-up automatically set to 1 day from now', [
            'lead_id' => $lead->id,
            'call_session_id' => $callSession->id,
            'call_direction' => $callSession->call_direction,
            'next_follow_up_at' => $followUpDate->toDateTimeString(),
        ]);

        // Inbound-specific: assign unassigned leads to whoever answered the call
        if ($callSession->call_direction === 'inbound' && ! $lead->assigned_to && $callSession->caller_id) {
            $lead->updateQuietly([
                'assigned_to' => $callSession->caller_id,
                'assigned_date' => now(),
                'inquiry_status' => 'assigned_to_cro',
                'next_follow_up_at' => now()->addDay(),
            ]);

            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => $callSession->caller_id,
                'type' => 'assignment_change',
                'status' => 'completed',
                'subject' => 'Lead assigned via inbound call',
                'description' => 'Lead was automatically assigned to the user who answered the inbound call.',
                'completed_at' => now(),
                'metadata' => [
                    'reason' => 'inbound_call_answered',
                    'call_session_id' => $callSession->id,
                    'session_id' => $callSession->session_id,
                ],
            ]);

            Log::info('Lead automatically assigned to user who answered inbound call', [
                'lead_id' => $lead->id,
                'assigned_to' => $callSession->caller_id,
                'call_session_id' => $callSession->id,
            ]);
        }

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

            Log::info('Lead status automatically updated to contacted (outbound call)', [
                'lead_id' => $lead->id,
                'previous_status' => $previousStatus,
                'call_session_id' => $callSession->id,
                'call_direction' => 'outbound',
            ]);
        }
    }
}
