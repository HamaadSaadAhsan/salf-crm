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
        if ($callSession->wasChanged('status') && $callSession->status === 'answered') {
            // Only process outbound calls
            if ($callSession->call_direction === 'outbound' && $callSession->lead_id) {
                $lead = Lead::find($callSession->lead_id);

                // Only update if lead exists and status is 'new'
                if ($lead && $lead->inquiry_status === 'new') {
                    $previousStatus = $lead->inquiry_status;
                    $lead->updateQuietly(['inquiry_status' => 'contacted']);

                    // Create activity to track status change
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
    }
}
