<?php

namespace App\Http\Controllers;

use App\Events\InboundCallReceived;
use App\Http\Requests\StoreInboundCallRequest;
use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AsteriskCallController extends Controller
{
    /**
     * Handle inbound call event from Asterisk.
     */
    public function handleInboundCall(StoreInboundCallRequest $request): JsonResponse
    {
        $validated = $request->validated();

        try {
            // Get extension from authenticated user or from request
            $exten = $validated['exten'] ?? auth()->user()?->extension;

            // Find call session by uniqueid or linkedid (created by incoming.php)
            // Match by linkedid because Asterisk creates multiple channels with different uniqueids but same linkedid
            $callSession = \App\Models\CallSession::where('call_direction', 'inbound')
                ->where(function ($query) use ($validated) {
                    $query->where('uniqueid', $validated['uniqueid'])
                        ->orWhere('uniqueid', $validated['linkedid']);
                })
                ->first();

            // Get lead from call session if exists
            $lead = null;
            if ($callSession && $callSession->lead_id) {
                $lead = Lead::where('id', $callSession->lead_id)
                    ->with(['service', 'assignedTo', 'source'])
                    ->first();
            }

            // Handle different call events
            if ($validated['event'] === 'ring') {
                // Log call activity if lead exists
                if ($lead) {
                    $this->logCallActivity($lead, $validated);

                    // Link the lead to the call session
                    if ($callSession) {
                        $callSession->update(['lead_id' => $lead->id]);
                        Log::info('Linked existing lead to call session', [
                            'lead_id' => $lead->id,
                            'call_session_id' => $callSession->id,
                        ]);
                    }
                }
            } elseif ($validated['event'] === 'connect') {
                // Call was answered - update status and track who answered
                if ($callSession) {
                    // Find who answered the call
                    $answeredByUser = $exten ? \App\Models\User::where('extension', $exten)->first() : null;
                    $answeredByUserId = $answeredByUser?->id;

                    // Check if this is a coverage call (answered by different user than intended)
                    $isCoverageCall = false;
                    if ($answeredByUserId && $callSession->intended_for_user_id) {
                        $isCoverageCall = $answeredByUserId !== $callSession->intended_for_user_id;
                    }

                    $callSession->update([
                        'status' => 'answered',
                        'answered_at' => now(),
                        'answered_by_user_id' => $answeredByUserId,
                        'is_coverage_call' => $isCoverageCall,
                    ]);

                    Log::info('Inbound call answered', [
                        'call_session_id' => $callSession->id,
                        'extension' => $exten,
                        'lead_found' => $lead !== null,
                        'answered_by_user_id' => $answeredByUserId,
                        'intended_for_user_id' => $callSession->intended_for_user_id,
                        'is_coverage_call' => $isCoverageCall,
                    ]);

                    // Handle coverage call: create activities for the intended CRO
                    if ($isCoverageCall && $lead && $callSession->intended_for_user_id) {
                        $this->handleCoverageCall($callSession, $lead, $answeredByUser);
                    }
                }
            } elseif ($validated['event'] === 'hangup') {
                // Call ended - update recording path and determine end reason
                if ($callSession) {
                    $recordingFilename = $callSession->call_signature
                        ? "{$callSession->call_signature}.wav"
                        : null;

                    // Calculate duration: ensure positive integer value
                    $duration = null;
                    if ($callSession->answered_at) {
                        $duration = (int) abs($callSession->answered_at->diffInSeconds(now()));
                    }

                    // Determine end_reason based on whether the call was answered
                    // If answered_at is null, the call was never answered (missed call)
                    $endReason = $callSession->answered_at ? 'hangup' : 'no_answer';

                    $callSession->update([
                        'status' => 'ended',
                        'ended_at' => now(),
                        'duration' => $duration,
                        'end_reason' => $endReason,
                        'recording_path' => $recordingFilename,
                    ]);

                    Log::info('Inbound call ended', [
                        'call_session_id' => $callSession->id,
                        'recording_path' => $recordingFilename,
                        'duration' => $duration,
                        'end_reason' => $endReason,
                        'was_answered' => $callSession->answered_at !== null,
                    ]);
                }
            }

            // Determine call direction and get routing info
            $callDirection = $callSession?->call_direction ?? 'inbound';
            $targetExtension = $callSession?->callee_number; // Extension receiving inbound call
            $agentExtension = $callSession?->caller_number ?? $exten; // For outbound, agent's extension

            // Get coverage call info from call session (updated in connect event)
            $answeredByUserId = $callSession?->answered_by_user_id;
            $intendedForUserId = $callSession?->intended_for_user_id;
            $isCoverageCall = (bool) $callSession?->is_coverage_call;

            // For connect event, if not yet in session, calculate it
            if ($validated['event'] === 'connect' && ! $answeredByUserId && $exten) {
                $answeredByUser = \App\Models\User::where('extension', $exten)->first();
                $answeredByUserId = $answeredByUser?->id;
            }

            // Broadcast the event to connected users
            broadcast(new InboundCallReceived(
                event: $validated['event'],
                caller: $validated['caller'],
                exten: $exten,
                uniqueid: $validated['uniqueid'],
                linkedid: $validated['linkedid'] ?? null,
                sessionId: $callSession?->session_id,
                lead: $lead,
                callDirection: $callDirection,
                targetExtension: $targetExtension,
                agentExtension: $agentExtension,
                answeredByUserId: $answeredByUserId,
                intendedForUserId: $intendedForUserId,
                isCoverageCall: $isCoverageCall
            ));

            return response()->json([
                'success' => true,
                'message' => 'Call event processed successfully',
                'data' => [
                    'lead_found' => $lead !== null,
                    'lead_id' => $lead?->id,
                    'call_session_id' => $callSession?->id,
                    'call_signature' => $callSession?->call_signature,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing inbound call', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error processing call event',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Store a new lead from inbound call.
     */
    public function storeCallLead(\Illuminate\Http\Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'service_id' => ['nullable', 'exists:services,id'],
            'detail' => ['nullable', 'string'],
            'budget' => ['nullable', 'array'],
            'uniqueid' => ['required', 'string'],
            'caller' => ['required', 'string'],
        ]);

        try {
            DB::beginTransaction();

            // Get "Inbound Call" source
            $inboundSource = \App\Models\LeadSource::where('identifier', 'inbound-call')
                ->orWhere('slug', 'inbound-call')
                ->first();

            $lead = Lead::create([
                'name' => $validated['name'],
                'phone' => $validated['phone'],
                'email' => $validated['email'] ?? null,
                'city' => $validated['city'] ?? null,
                'service_id' => $validated['service_id'] ?? null,
                'lead_source_id' => $inboundSource?->id,
                'detail' => $validated['detail'] ?? null,
                'budget' => $validated['budget'] ?? null,
                'inquiry_status' => 'new',
                'priority' => 'medium',
                'created_by' => auth()->id(),
                'assigned_to' => auth()->id(),
            ]);

            // Create call activity
            LeadActivity::create([
                'lead_id' => $lead->id,
                'user_id' => auth()->id(),
                'type' => 'call',
                'subject' => 'Inbound call received',
                'description' => 'Received inbound call',
                'status' => 'completed',
                'completed_at' => now(),
                'metadata' => [
                    'call_id' => $validated['uniqueid'],
                    'caller' => $validated['caller'],
                    'direction' => 'inbound',
                ],
                'source_system' => 'asterisk',
                'external_id' => $validated['uniqueid'],
            ]);

            // Link the lead to the call session
            $callSession = \App\Models\CallSession::where('caller_number', $validated['caller'])
                ->whereNull('lead_id')
                ->where('call_direction', 'inbound')
                ->where('created_at', '>=', now()->subMinutes(5))
                ->orderBy('created_at', 'desc')
                ->first();

            if ($callSession) {
                $callSession->update(['lead_id' => $lead->id]);
                Log::info('Linked lead to call session', [
                    'lead_id' => $lead->id,
                    'call_session_id' => $callSession->id,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lead created successfully',
                'data' => [
                    'lead' => $lead->load(['service', 'assignedTo', 'source']),
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error creating lead from call', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error creating lead',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Save call notes to lead activity.
     */
    public function saveCallNotes(\Illuminate\Http\Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => ['required', 'exists:leads,id'],
            'notes' => ['required', 'string'],
            'uniqueid' => ['required', 'string'],
            'duration' => ['nullable', 'integer', 'min:0'],
        ]);

        try {
            $lead = Lead::findOrFail($validated['lead_id']);

            // Find or create call activity
            $activity = LeadActivity::where('external_id', $validated['uniqueid'])
                ->where('lead_id', $lead->id)
                ->first();

            if ($activity) {
                $activity->update([
                    'notes' => $validated['notes'],
                    'duration_minutes' => isset($validated['duration']) ? ceil($validated['duration'] / 60) : null,
                ]);
            } else {
                $activity = LeadActivity::create([
                    'lead_id' => $lead->id,
                    'user_id' => auth()->id(),
                    'type' => 'call',
                    'subject' => 'Inbound call',
                    'notes' => $validated['notes'],
                    'status' => 'completed',
                    'completed_at' => now(),
                    'duration_minutes' => isset($validated['duration']) ? ceil($validated['duration'] / 60) : null,
                    'metadata' => [
                        'call_id' => $validated['uniqueid'],
                        'direction' => 'inbound',
                    ],
                    'source_system' => 'asterisk',
                    'external_id' => $validated['uniqueid'],
                ]);
            }

            // Update lead's last activity
            $lead->touch('last_activity_at');

            return response()->json([
                'success' => true,
                'message' => 'Notes saved successfully',
                'data' => [
                    'activity' => $activity,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error saving call notes', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error saving notes',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Normalize phone number for matching.
     */
    private function normalizePhoneNumber(string $phone): string
    {
        // Remove common prefixes and non-numeric characters
        $normalized = preg_replace('/[^0-9]/', '', $phone);

        // Remove leading zeros or country codes
        $normalized = ltrim($normalized, '0');

        // Get last 10 digits for matching
        if (strlen($normalized) > 10) {
            $normalized = substr($normalized, -10);
        }

        return $normalized;
    }

    /**
     * Link a lead to a call session.
     */
    public function linkLeadToSession(\Illuminate\Http\Request $request, string $sessionId): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => ['required', 'exists:leads,id'],
        ]);

        try {
            $callSession = \App\Models\CallSession::where('session_id', $sessionId)->first();

            if (! $callSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found',
                ], 404);
            }

            $callSession->update(['lead_id' => $validated['lead_id']]);

            Log::info('Linked lead to call session', [
                'lead_id' => $validated['lead_id'],
                'call_session_id' => $callSession->id,
                'session_id' => $sessionId,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Lead linked to call session successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error linking lead to call session', [
                'error' => $e->getMessage(),
                'session_id' => $sessionId,
                'lead_id' => $validated['lead_id'] ?? null,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error linking lead',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Handle coverage call: create activities for the intended CRO.
     * This is called when a call is answered by a different CRO than the lead's assigned CRO.
     */
    private function handleCoverageCall(
        \App\Models\CallSession $callSession,
        Lead $lead,
        ?\App\Models\User $answeredByUser
    ): void {
        $intendedUserId = $callSession->intended_for_user_id;
        $answeredByName = $answeredByUser?->name ?? 'Another CRO';

        // 1. Create "contacted" activity (completed call activity)
        LeadActivity::create([
            'lead_id' => $lead->id,
            'user_id' => $answeredByUser?->id ?? $intendedUserId,
            'type' => 'call',
            'subject' => 'Coverage call - Lead contacted',
            'description' => "Inbound call answered by {$answeredByName} on behalf of the assigned CRO.",
            'status' => 'completed',
            'completed_at' => now(),
            'metadata' => [
                'call_session_id' => $callSession->id,
                'session_id' => $callSession->session_id,
                'caller_number' => $callSession->caller_number,
                'is_coverage_call' => true,
                'answered_by_user_id' => $answeredByUser?->id,
                'intended_for_user_id' => $intendedUserId,
                'direction' => 'inbound',
            ],
            'source_system' => 'asterisk',
            'external_id' => $callSession->session_id,
        ]);

        // 2. Create "follow_up" activity for the intended (assigned) CRO
        LeadActivity::create([
            'lead_id' => $lead->id,
            'user_id' => $intendedUserId,
            'type' => 'follow_up',
            'subject' => 'Follow up on coverage call',
            'description' => "Your lead received an inbound call that was answered by {$answeredByName}. Please follow up to review the call and take any necessary action.",
            'status' => 'pending',
            'priority' => 'high',
            'scheduled_at' => now(),
            'due_at' => now()->addHours(4),
            'metadata' => [
                'call_session_id' => $callSession->id,
                'session_id' => $callSession->session_id,
                'caller_number' => $callSession->caller_number,
                'is_coverage_call' => true,
                'answered_by_user_id' => $answeredByUser?->id,
                'answered_by_name' => $answeredByName,
                'direction' => 'inbound',
            ],
            'source_system' => 'asterisk',
        ]);

        Log::info('Coverage call activities created', [
            'lead_id' => $lead->id,
            'intended_for_user_id' => $intendedUserId,
            'answered_by_user_id' => $answeredByUser?->id,
            'call_session_id' => $callSession->id,
        ]);
    }

    /**
     * Log call activity for the lead.
     */
    private function logCallActivity(Lead $lead, array $callData): void
    {
        $exten = $callData['exten'] ?? auth()->user()?->extension ?? 'unknown';

        LeadActivity::create([
            'lead_id' => $lead->id,
            'user_id' => $lead->assigned_to ?? auth()->id(),
            'type' => 'call',
            'subject' => 'Inbound call received',
            'description' => "Inbound call to extension {$exten}",
            'status' => 'pending',
            'scheduled_at' => now(),
            'metadata' => [
                'call_id' => $callData['uniqueid'],
                'linked_id' => $callData['linkedid'] ?? null,
                'caller' => $callData['caller'],
                'exten' => $exten,
                'direction' => 'inbound',
                'event' => $callData['event'],
            ],
            'source_system' => 'asterisk',
            'external_id' => $callData['uniqueid'],
        ]);
    }

    /**
     * Handle ring group member notification.
     * Called when a call is being transferred/routed to a new extension (e.g., via ring group).
     * This broadcasts a new "ring" event to the new extension so they see the incoming call dialog.
     */
    public function handleRingGroupMember(\Illuminate\Http\Request $request): JsonResponse
    {
        $validated = $request->validate([
            'exten' => ['required', 'string'],
            'uniqueid' => ['required', 'string'],
            'linkedid' => ['required', 'string'],
            'caller' => ['nullable', 'string'],
        ]);

        try {
            // Find call session by linkedid (the common link across all channels in a call)
            $callSession = \App\Models\CallSession::where('call_direction', 'inbound')
                ->where(function ($query) use ($validated) {
                    $query->where('uniqueid', $validated['linkedid'])
                        ->orWhere('uniqueid', $validated['uniqueid']);
                })
                ->whereIn('status', ['ringing', 'answered'])
                ->first();

            // Fallback: Find by caller_number for recent inbound calls (within last 2 minutes)
            // This handles cases where the child channel's linkedid doesn't match the parent's uniqueid
            if (! $callSession && ! empty($validated['caller'])) {
                $callSession = \App\Models\CallSession::where('call_direction', 'inbound')
                    ->where('caller_number', $validated['caller'])
                    ->whereIn('status', ['ringing', 'answered'])
                    ->where('started_at', '>=', now()->subMinutes(2))
                    ->orderBy('started_at', 'desc')
                    ->first();

                if ($callSession) {
                    Log::info('Ring group member notification: Found call session by caller number', [
                        'caller' => $validated['caller'],
                        'call_session_id' => $callSession->id,
                    ]);
                }
            }

            if (! $callSession) {
                Log::warning('Ring group member notification: Call session not found', [
                    'linkedid' => $validated['linkedid'],
                    'uniqueid' => $validated['uniqueid'],
                    'caller' => $validated['caller'] ?? 'not provided',
                    'exten' => $validated['exten'],
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found',
                ], 404);
            }

            // Skip if call is already answered (connect event already sent)
            if ($callSession->status === 'answered') {
                Log::info('Ring group member notification: Call already answered, skipping', [
                    'call_session_id' => $callSession->id,
                    'exten' => $validated['exten'],
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Call already answered',
                    'skipped' => true,
                ]);
            }

            // Get lead from call session if exists
            $lead = null;
            if ($callSession->lead_id) {
                $lead = Lead::where('id', $callSession->lead_id)
                    ->with(['service', 'assignedTo', 'source'])
                    ->first();
            }

            // Determine the caller number
            $callerNumber = $validated['caller'] ?? $callSession->caller_number;

            Log::info('Ring group member notification: Broadcasting ring event', [
                'call_session_id' => $callSession->id,
                'new_extension' => $validated['exten'],
                'original_extension' => $callSession->callee_number,
                'caller' => $callerNumber,
                'lead_id' => $lead?->id,
            ]);

            // Broadcast a new ring event for this extension
            // This will trigger the incoming call dialog for the new extension
            broadcast(new InboundCallReceived(
                event: 'ring',
                caller: $callerNumber,
                exten: $validated['exten'],
                uniqueid: $validated['uniqueid'],
                linkedid: $validated['linkedid'],
                sessionId: $callSession->session_id,
                lead: $lead,
                callDirection: 'inbound',
                targetExtension: $validated['exten'], // New extension being rung
                agentExtension: null,
                answeredByUserId: null,
                intendedForUserId: $callSession->intended_for_user_id,
                isCoverageCall: false
            ));

            return response()->json([
                'success' => true,
                'message' => 'Ring group member notification sent',
                'data' => [
                    'call_session_id' => $callSession->id,
                    'extension' => $validated['exten'],
                    'lead_id' => $lead?->id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing ring group member notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error processing notification',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
