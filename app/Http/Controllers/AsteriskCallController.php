<?php

namespace App\Http\Controllers;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use App\Events\InboundCallReceived;
use App\Events\OutboundCallReceived;
use App\Http\Requests\StoreInboundCallRequest;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Task;
use App\Models\User;
use App\Services\CROAssignmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AsteriskCallController extends Controller
{
    public function __construct(
        private CROAssignmentService $croAssignmentService
    ) {}

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
            if ($validated['event'] === 'stop_ringing') {
                // Stop ringing event - clear notification from specific extension
                // This is used when a call moves from one extension to another in a ring group
                $targetExtension = $validated['targetExtension'] ?? $validated['exten'];
                $stopRingingUser = $targetExtension ? \App\Models\User::where('extension', $targetExtension)->first() : null;

                Log::info('Stop ringing event received', [
                    'uniqueid' => $validated['uniqueid'],
                    'linkedid' => $validated['linkedid'] ?? null,
                    'target_extension' => $targetExtension,
                    'reason' => $validated['reason'] ?? 'unknown',
                    'dialstatus' => $validated['dialstatus'] ?? null,
                ]);

                // Log stop_ringing event to call_logs
                if ($callSession) {
                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'stop_ringing',
                        "Extension {$targetExtension} stopped ringing",
                        [
                            'extension' => $targetExtension,
                            'user_id' => $stopRingingUser?->id,
                            'user_name' => $stopRingingUser?->name,
                            'uniqueid' => $validated['uniqueid'],
                            'linkedid' => $validated['linkedid'] ?? null,
                            'reason' => $validated['reason'] ?? 'unknown',
                            'dialstatus' => $validated['dialstatus'] ?? null,
                            'caller_number' => $validated['caller'] ?? null,
                        ],
                        'asterisk'
                    );
                }

                // Broadcast the stop_ringing event to clear notification
                broadcast(new InboundCallReceived(
                    event: 'stop_ringing',
                    caller: $validated['caller'] ?? '',
                    exten: $targetExtension ?? '',
                    uniqueid: $validated['uniqueid'],
                    linkedid: $validated['linkedid'] ?? null,
                    sessionId: $callSession?->session_id,
                    lead: $lead,
                    callDirection: 'inbound',
                    targetExtension: $targetExtension,
                    agentExtension: null,
                    answeredByUserId: null,
                    intendedForUserId: $callSession?->intended_for_user_id,
                    isCoverageCall: false,
                    reason: $validated['reason'] ?? null,
                    dialstatus: $validated['dialstatus'] ?? null
                ));

                return response()->json([
                    'success' => true,
                    'message' => 'Stop ringing event processed',
                    'data' => [
                        'target_extension' => $targetExtension,
                        'reason' => $validated['reason'] ?? null,
                    ],
                ]);
            } elseif ($validated['event'] === 'ring') {
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

                // Log ring event to call_logs
                if ($callSession) {
                    $ringUser = $exten ? \App\Models\User::where('extension', $exten)->first() : null;
                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'ringing',
                        "Extension {$exten} ringing",
                        [
                            'extension' => $exten,
                            'user_id' => $ringUser?->id,
                            'user_name' => $ringUser?->name,
                            'uniqueid' => $validated['uniqueid'],
                            'linkedid' => $validated['linkedid'] ?? null,
                            'caller_number' => $validated['caller'] ?? null,
                            'lead_id' => $lead?->id,
                        ],
                        'asterisk'
                    );
                }
            } elseif ($validated['event'] === 'connect') {
                // Call was answered - update status and track who answered
                // Skip if exten is a client phone number (not an agent extension)
                // Agent extensions are short (2-4 digits like 201, 202), client numbers are longer
                $isAgentExtension = $exten && strlen(preg_replace('/[^0-9]/', '', $exten)) <= 4;

                if ($callSession && $isAgentExtension && ! $callSession->answered_at) {
                    // Find who answered the call
                    $answeredByUser = \App\Models\User::where('extension', $exten)->first();
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

                    // Log connect event to call_logs
                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'answered',
                        "Call answered by extension {$exten}",
                        [
                            'extension' => $exten,
                            'user_id' => $answeredByUserId,
                            'user_name' => $answeredByUser?->name,
                            'uniqueid' => $validated['uniqueid'],
                            'linkedid' => $validated['linkedid'] ?? null,
                            'caller_number' => $validated['caller'] ?? null,
                            'lead_id' => $lead?->id,
                            'is_coverage_call' => $isCoverageCall,
                            'intended_for_user_id' => $callSession->intended_for_user_id,
                        ],
                        'asterisk'
                    );

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

                    // Log hangup event to call_logs
                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'hangup',
                        $endReason === 'no_answer' ? 'Call ended - no answer' : 'Call ended - hangup',
                        [
                            'extension' => $exten,
                            'uniqueid' => $validated['uniqueid'],
                            'linkedid' => $validated['linkedid'] ?? null,
                            'caller_number' => $validated['caller'] ?? null,
                            'lead_id' => $lead?->id,
                            'duration' => $duration,
                            'end_reason' => $endReason,
                            'recording_path' => $recordingFilename,
                            'was_answered' => $callSession->answered_at !== null,
                        ],
                        'asterisk'
                    );

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
            // IMPORTANT: For ring events, use the exten from the request (current ringing extension)
            // not from call session (which stores the original target)
            // This is critical for ring groups where the call moves between extensions
            $targetExtension = $validated['targetExtension'] ?? $validated['exten'] ?? $callSession?->callee_number;
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
                caller: $validated['caller'] ?? '',
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

            // Determine assignment: if CRO answered the call, assign to them; otherwise use fair distribution
            $currentUser = auth()->user();
            $croRoles = ['support-agent', 'senior-support-agent'];
            $adminRoles = ['super-admin', 'admin', 'manager', 'team-lead'];
            $isCRO = $currentUser && $currentUser->hasAnyRole($croRoles) && ! $currentUser->hasAnyRole($adminRoles);

            // Create lead first
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
            ]);

            // Assign lead: if CRO answered, assign to them; otherwise use fair distribution
            if ($isCRO) {
                // CRO answered the call - assign directly to them
                $lead->assigned_to = auth()->id();
                $lead->assigned_date = now();
                $lead->save();

                // Update CRO's lead count
                $currentUser->increment('current_lead_count');
                $currentUser->update(['last_assignment_at' => now()]);
            } else {
                // Non-CRO user (including admins) - use fair distribution
                // Admins should not be auto-assigned leads, so only assign if assignment service succeeds
                $isAdmin = $currentUser && $currentUser->hasAnyRole($adminRoles);

                if ($isAdmin) {
                    // Admin created the lead - leave unassigned for manual assignment
                    // Don't auto-assign to admin
                    Log::info('Lead created by admin - left unassigned for manual assignment', [
                        'lead_id' => $lead->id,
                        'admin_id' => auth()->id(),
                    ]);
                } else {
                    // Regular user - try to assign via fair distribution
                    if (! $this->croAssignmentService->assignCRO($lead)) {
                        // Fallback: assign to current user if assignment service fails (only for non-admins)
                        $lead->assigned_to = auth()->id();
                        $lead->assigned_date = now();
                        $lead->save();
                    }
                }
            }

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

        // Use updateOrCreate to handle duplicate ring events (common in ring groups)
        LeadActivity::updateOrCreate(
            [
                'external_id' => $callData['uniqueid'],
                'source_system' => 'asterisk',
            ],
            [
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
            ]
        );
    }

    /**
     * Handle ring group member notification.
     * Called when a call is being transferred/routed to a new extension (e.g., via ring group).
     * This broadcasts a new "ring" event to the new extension so they see the incoming call dialog.
     *
     * IMPORTANT: This should ONLY notify extensions that are DIFFERENT from the original
     * target extension. The original extension already receives the initial ring notification
     * from incoming.php -> server.js flow.
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
            Log::debug('Ring group member notification: Starting lookup', [
                'exten' => $validated['exten'],
                'uniqueid' => $validated['uniqueid'],
                'linkedid' => $validated['linkedid'],
                'caller' => $validated['caller'] ?? 'not provided',
            ]);

            // Strategy 1: Find call session by linkedid/uniqueid match
            // The linkedid of child channels should match the uniqueid of the parent channel
            $callSession = \App\Models\CallSession::where('call_direction', 'inbound')
                ->where(function ($query) use ($validated) {
                    $query->where('uniqueid', $validated['linkedid'])
                        ->orWhere('uniqueid', $validated['uniqueid']);
                })
                ->whereIn('status', ['ringing', 'initiated', 'answered'])
                ->first();

            // Strategy 2: Find by caller_number for recent inbound calls (within last 5 minutes)
            // This handles cases where ring group creates new channels with different uniqueids
            if (! $callSession && ! empty($validated['caller'])) {
                // Normalize the caller number for matching
                $normalizedCaller = preg_replace('/[^0-9]/', '', $validated['caller']);
                $last10Digits = substr($normalizedCaller, -10);

                $callSession = \App\Models\CallSession::where('call_direction', 'inbound')
                    ->where(function ($query) use ($validated, $last10Digits) {
                        // Match exact caller_number OR last 10 digits
                        $query->where('caller_number', $validated['caller'])
                            ->orWhereRaw("RIGHT(REGEXP_REPLACE(caller_number, '[^0-9]', '', 'g'), 10) = ?", [$last10Digits]);
                    })
                    ->whereIn('status', ['ringing', 'initiated', 'answered'])
                    ->where('created_at', '>=', now()->subMinutes(5))
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($callSession) {
                    Log::info('Ring group member notification: Found call session by caller number', [
                        'caller' => $validated['caller'],
                        'call_session_id' => $callSession->id,
                        'session_id' => $callSession->session_id,
                    ]);
                }
            }

            // Strategy 3: Last resort - find ANY recent inbound call from this caller
            // Even if status has changed to 'ended', we still want to notify the extension
            // This handles the case where the initial dial ended (no answer) and ring group takes over
            if (! $callSession && ! empty($validated['caller'])) {
                $normalizedCaller = preg_replace('/[^0-9]/', '', $validated['caller']);
                $last10Digits = substr($normalizedCaller, -10);

                // Find the MOST RECENT call session from this caller (within 2 minutes)
                // regardless of status - the ring group might start after initial dial ended
                $callSession = \App\Models\CallSession::where('call_direction', 'inbound')
                    ->where(function ($query) use ($validated, $last10Digits) {
                        $query->where('caller_number', $validated['caller'])
                            ->orWhereRaw("RIGHT(REGEXP_REPLACE(caller_number, '[^0-9]', '', 'g'), 10) = ?", [$last10Digits]);
                    })
                    ->where('created_at', '>=', now()->subMinutes(2))
                    ->orderBy('created_at', 'desc')
                    ->first();

                if ($callSession) {
                    Log::info('Ring group member notification: Found call session by caller (last resort)', [
                        'caller' => $validated['caller'],
                        'call_session_id' => $callSession->id,
                        'session_id' => $callSession->session_id,
                        'status' => $callSession->status,
                    ]);
                }
            }

            if (! $callSession) {
                Log::warning('Ring group member notification: Call session not found after all strategies', [
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

            // CRITICAL: Skip notification if this extension was the ORIGINAL target
            // The original target already received the ring notification via incoming.php -> server.js flow
            // We only want to notify NEW extensions being added via ring group escalation
            $originalTargetExtension = $callSession->callee_number;
            if ($validated['exten'] === $originalTargetExtension) {
                Log::info('Ring group member notification: Skipping - extension is original target', [
                    'call_session_id' => $callSession->id,
                    'exten' => $validated['exten'],
                    'original_extension' => $originalTargetExtension,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Skipped - extension is original target',
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

            Log::info('Ring group member notification: Broadcasting ring event to new extension', [
                'call_session_id' => $callSession->id,
                'new_extension' => $validated['exten'],
                'original_extension' => $originalTargetExtension,
                'caller' => $callerNumber,
                'lead_id' => $lead?->id,
                'session_id' => $callSession->session_id,
            ]);

            // Find user for this extension
            $ringGroupUser = \App\Models\User::where('extension', $validated['exten'])->first();

            // Log the ring event for this ring group member
            \App\Models\CallLog::createForSession(
                $callSession,
                'info',
                'ring_group_ringing',
                "Ring group member {$validated['exten']} ringing",
                [
                    'extension' => $validated['exten'],
                    'user_id' => $ringGroupUser?->id,
                    'user_name' => $ringGroupUser?->name,
                    'uniqueid' => $validated['uniqueid'],
                    'linkedid' => $validated['linkedid'],
                    'caller_number' => $callerNumber,
                    'lead_id' => $lead?->id,
                    'is_ring_group_member' => true,
                    'original_extension' => $originalTargetExtension,
                ],
                'asterisk'
            );

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

    /**
     * Handle outbound call event from WebSocket/Asterisk.
     * This endpoint processes outbound call state changes and logs them.
     */
    public function handleOutboundCall(\Illuminate\Http\Request $request): JsonResponse
    {
        $validated = $request->validate([
            'event' => ['required', 'string', 'in:outbound_agent_dial,outbound_client_dial,outbound_agent_answer,outbound_client_answer,outbound_connect,outbound_hangup'],
            'session_id' => ['required', 'string'],
            'uniqueid' => ['nullable', 'string'],
            'linkedid' => ['nullable', 'string'],
            'agent' => ['nullable', 'string'],
            'client' => ['nullable', 'string'],
            'phase' => ['nullable', 'string'],
            'dialstatus' => ['nullable', 'string'],
            'cause' => ['nullable', 'string'],
            'duration' => ['nullable', 'integer'],
        ]);

        try {
            // Find call session by session_id, linkedid, or uniqueid
            // Try multiple lookup strategies since timing can cause session to not be found immediately
            $callSession = null;
            $lookupStrategy = null;

            Log::debug('Outbound call event lookup starting', [
                'event' => $validated['event'],
                'session_id' => $validated['session_id'],
                'linkedid' => $validated['linkedid'] ?? null,
                'uniqueid' => $validated['uniqueid'] ?? null,
                'agent' => $validated['agent'] ?? null,
                'client' => $validated['client'] ?? null,
            ]);

            // Strategy 1: By session_id (primary lookup)
            if (! empty($validated['session_id'])) {
                $callSession = \App\Models\CallSession::where('session_id', $validated['session_id'])->first();
                if ($callSession) {
                    $lookupStrategy = 'session_id';
                }
            }

            // Strategy 2: By linkedid (Asterisk's call chain identifier)
            if (! $callSession && ! empty($validated['linkedid'])) {
                $callSession = \App\Models\CallSession::where('linkedid', $validated['linkedid'])->first();
                if ($callSession) {
                    $lookupStrategy = 'linkedid';
                }
            }

            // Strategy 3: By uniqueid
            if (! $callSession && ! empty($validated['uniqueid'])) {
                $callSession = \App\Models\CallSession::where('uniqueid', $validated['uniqueid'])->first();
                if ($callSession) {
                    $lookupStrategy = 'uniqueid';
                }
            }

            // Strategy 4: By caller_number (agent extension) + callee_number (client) for recent calls
            if (! $callSession && ! empty($validated['agent']) && ! empty($validated['client'])) {
                $callSession = \App\Models\CallSession::where('caller_number', $validated['agent'])
                    ->where('callee_number', $validated['client'])
                    ->where('call_direction', 'outbound')
                    ->where('created_at', '>=', now()->subMinutes(2))
                    ->whereIn('status', ['initiated', 'ringing', 'answered'])
                    ->orderByDesc('created_at')
                    ->first();
                if ($callSession) {
                    $lookupStrategy = 'agent_client';
                }
            }

            if (! $callSession) {
                Log::warning('Outbound call event: Session not found after all strategies', [
                    'session_id' => $validated['session_id'],
                    'linkedid' => $validated['linkedid'] ?? null,
                    'uniqueid' => $validated['uniqueid'] ?? null,
                    'agent' => $validated['agent'] ?? null,
                    'client' => $validated['client'] ?? null,
                    'event' => $validated['event'],
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found',
                ], 404);
            }

            Log::info('Outbound call event: Session found', [
                'strategy' => $lookupStrategy,
                'db_session_id' => $callSession->session_id,
                'event' => $validated['event'],
            ]);

            // Update linkedid if we found session but it doesn't have one yet
            if (! empty($validated['linkedid']) && empty($callSession->linkedid)) {
                $callSession->update(['linkedid' => $validated['linkedid']]);
            }

            // Update uniqueid if we found session but it doesn't have one yet
            if (! empty($validated['uniqueid']) && empty($callSession->uniqueid)) {
                $callSession->update(['uniqueid' => $validated['uniqueid']]);
            }

            // Get lead from call session
            $lead = null;
            if ($callSession->lead_id) {
                $lead = Lead::where('id', $callSession->lead_id)
                    ->with(['service', 'assignedTo', 'source'])
                    ->first();
            }

            // Handle different outbound call events
            switch ($validated['event']) {
                case 'outbound_agent_dial':
                    // System is dialing the agent's phone (first leg)
                    $callSession->update(['status' => 'ringing']);

                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'outbound_agent_dial',
                        "Dialing agent extension {$validated['agent']}",
                        [
                            'agent' => $validated['agent'],
                            'client' => $validated['client'],
                            'phase' => $validated['phase'] ?? 'agent_dial',
                            'uniqueid' => $validated['uniqueid'] ?? null,
                            'linkedid' => $validated['linkedid'] ?? null,
                        ],
                        'websocket'
                    );

                    Log::info('Outbound call: Agent dial', [
                        'session_id' => $callSession->session_id,
                        'agent' => $validated['agent'],
                        'client' => $validated['client'],
                    ]);

                    // Broadcast outbound call event
                    broadcast(new OutboundCallReceived(
                        event: 'ring',
                        agentExtension: $validated['agent'] ?? '',
                        clientNumber: $validated['client'] ?? '',
                        uniqueid: $validated['uniqueid'] ?? '',
                        linkedid: $validated['linkedid'] ?? null,
                        sessionId: $callSession->session_id,
                        lead: $lead,
                        callDirection: 'outbound',
                        phase: $validated['phase'] ?? 'agent_dial'
                    ));
                    break;

                case 'outbound_agent_answer':
                    // Agent answered their phone
                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'outbound_agent_answer',
                        "Agent {$validated['agent']} answered",
                        [
                            'agent' => $validated['agent'],
                            'client' => $validated['client'],
                            'uniqueid' => $validated['uniqueid'] ?? null,
                            'linkedid' => $validated['linkedid'] ?? null,
                        ],
                        'websocket'
                    );

                    Log::info('Outbound call: Agent answered', [
                        'session_id' => $callSession->session_id,
                        'agent' => $validated['agent'],
                    ]);
                    break;

                case 'outbound_client_dial':
                    // Agent's phone is now dialing the client (second leg)
                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'outbound_client_dial',
                        "Dialing client {$validated['client']}",
                        [
                            'agent' => $validated['agent'],
                            'client' => $validated['client'],
                            'phase' => $validated['phase'] ?? 'client_dial',
                            'uniqueid' => $validated['uniqueid'] ?? null,
                            'linkedid' => $validated['linkedid'] ?? null,
                        ],
                        'websocket'
                    );

                    Log::info('Outbound call: Client dial', [
                        'session_id' => $callSession->session_id,
                        'agent' => $validated['agent'],
                        'client' => $validated['client'],
                    ]);
                    break;

                case 'outbound_client_answer':
                case 'outbound_connect':
                    // Client answered - call is now connected
                    $callSession->update([
                        'status' => 'answered',
                        'answered_at' => now(),
                    ]);

                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'outbound_connected',
                        "Call connected - client {$validated['client']} answered",
                        [
                            'agent' => $validated['agent'],
                            'client' => $validated['client'],
                            'uniqueid' => $validated['uniqueid'] ?? null,
                            'linkedid' => $validated['linkedid'] ?? null,
                            'lead_id' => $lead?->id,
                        ],
                        'websocket'
                    );

                    // Create call activity for the lead
                    if ($lead) {
                        $userId = $callSession->caller_id ?? auth()->id();

                        LeadActivity::updateOrCreate(
                            [
                                'external_id' => $callSession->session_id,
                                'source_system' => 'asterisk',
                            ],
                            [
                                'lead_id' => $lead->id,
                                'user_id' => $userId,
                                'type' => 'call',
                                'subject' => 'Outbound call connected',
                                'description' => "Called {$validated['client']}",
                                'status' => 'pending',
                                'scheduled_at' => now(),
                                'metadata' => [
                                    'call_session_id' => $callSession->id,
                                    'session_id' => $callSession->session_id,
                                    'agent' => $validated['agent'],
                                    'client' => $validated['client'],
                                    'direction' => 'outbound',
                                ],
                            ]
                        );

                        // Check if the caller is a CRO and automatically create "contacted" activity and follow-up task
                        if ($userId) {
                            $callerUser = User::find($userId);
                            if ($callerUser) {
                                $croRoles = ['support-agent', 'senior-support-agent'];
                                $adminRoles = ['super-admin', 'admin', 'manager', 'team-lead'];
                                $isCRO = $callerUser->hasAnyRole($croRoles) && ! $callerUser->hasAnyRole($adminRoles);

                                if ($isCRO) {
                                    // Create "contacted" activity
                                    LeadActivity::create([
                                        'lead_id' => $lead->id,
                                        'user_id' => $userId,
                                        'type' => 'call',
                                        'subject' => 'Lead contacted',
                                        'description' => "CRO contacted lead via outbound call to {$validated['client']}",
                                        'status' => 'completed',
                                        'completed_at' => now(),
                                        'metadata' => [
                                            'call_session_id' => $callSession->id,
                                            'session_id' => $callSession->session_id,
                                            'agent' => $validated['agent'],
                                            'client' => $validated['client'],
                                            'direction' => 'outbound',
                                            'auto_created' => true,
                                        ],
                                        'source_system' => 'asterisk',
                                    ]);

                                    // Update lead status to "contacted" if it's currently "new" or "assigned_to_cro"
                                    $originalStatus = $lead->inquiry_status;
                                    if (in_array($originalStatus, ['new', 'assigned_to_cro'], true)) {
                                        $lead->inquiry_status = 'contacted';
                                        $lead->save();

                                        // Log status change activity
                                        LeadActivity::create([
                                            'lead_id' => $lead->id,
                                            'user_id' => $userId,
                                            'type' => 'status_change',
                                            'status' => 'completed',
                                            'subject' => 'Lead status updated',
                                            'description' => 'Status changed to contacted after CRO made outbound call.',
                                            'metadata' => [
                                                'from_status' => $originalStatus,
                                                'to_status' => 'contacted',
                                                'triggered_by' => 'outbound_call',
                                            ],
                                        ]);
                                    }

                                    // Create follow-up task for the CRO
                                    Task::create([
                                        'taskable_type' => Lead::class,
                                        'taskable_id' => $lead->id,
                                        'title' => "Follow up with {$lead->name}",
                                        'description' => "Follow up after outbound call to {$validated['client']}",
                                        'type' => TaskType::FOLLOW_UP,
                                        'status' => TaskStatus::PENDING,
                                        'priority' => TaskPriority::MEDIUM,
                                        'assigned_to_id' => $userId,
                                        'created_by_id' => $userId,
                                        'due_at' => now()->addDays(3), // Follow up in 3 days by default
                                    ]);

                                    Log::info('CRO outbound call: Created contacted activity and follow-up task', [
                                        'lead_id' => $lead->id,
                                        'user_id' => $userId,
                                        'call_session_id' => $callSession->id,
                                    ]);
                                }
                            }
                        }
                    }

                    Log::info('Outbound call: Connected', [
                        'session_id' => $callSession->session_id,
                        'agent' => $validated['agent'],
                        'client' => $validated['client'],
                        'lead_id' => $lead?->id,
                    ]);

                    // Broadcast outbound call connected event (triggers dialog)
                    broadcast(new OutboundCallReceived(
                        event: 'connect',
                        agentExtension: $validated['agent'] ?? '',
                        clientNumber: $validated['client'] ?? '',
                        uniqueid: $validated['uniqueid'] ?? '',
                        linkedid: $validated['linkedid'] ?? null,
                        sessionId: $callSession->session_id,
                        lead: $lead,
                        callDirection: 'outbound',
                        phase: 'connected',
                        duration: $validated['duration'] ?? null
                    ));
                    break;

                case 'outbound_hangup':
                    // Call ended
                    $duration = $validated['duration'] ?? null;
                    if (! $duration && $callSession->answered_at) {
                        $duration = (int) abs($callSession->answered_at->diffInSeconds(now()));
                    }

                    // dialstatus may not always be present in outbound events
                    $dialStatus = $validated['dialstatus'] ?? null;

                    $endReason = $callSession->answered_at ? 'hangup' : 'no_answer';
                    if ($dialStatus === 'BUSY') {
                        $endReason = 'busy';
                    } elseif ($dialStatus === 'CANCEL') {
                        $endReason = 'cancelled';
                    } elseif ($dialStatus === 'NOANSWER') {
                        $endReason = 'no_answer';
                    }

                    $recordingFilename = $callSession->call_signature
                        ? "{$callSession->call_signature}.wav"
                        : null;

                    $callSession->update([
                        'status' => 'ended',
                        'ended_at' => now(),
                        'duration' => $duration,
                        'end_reason' => $endReason,
                        'recording_path' => $recordingFilename,
                    ]);

                    \App\Models\CallLog::createForSession(
                        $callSession,
                        'info',
                        'outbound_hangup',
                        "Call ended - {$endReason}",
                        [
                            'agent' => $validated['agent'],
                            'client' => $validated['client'],
                            'duration' => $duration,
                            'end_reason' => $endReason,
                            'dialstatus' => $dialStatus,
                            'cause' => $validated['cause'] ?? null,
                            'recording_path' => $recordingFilename,
                            'lead_id' => $lead?->id,
                        ],
                        'websocket'
                    );

                    // Update lead activity if exists
                    if ($lead) {
                        $activity = LeadActivity::where('external_id', $callSession->session_id)
                            ->where('source_system', 'asterisk')
                            ->first();

                        if ($activity) {
                            $activity->update([
                                'status' => 'completed',
                                'completed_at' => now(),
                                'duration_minutes' => $duration ? ceil($duration / 60) : null,
                            ]);
                        }
                    }

                    Log::info('Outbound call: Ended', [
                        'session_id' => $callSession->session_id,
                        'duration' => $duration,
                        'end_reason' => $endReason,
                        'lead_id' => $lead?->id,
                    ]);

                    // Broadcast outbound call ended event
                    broadcast(new OutboundCallReceived(
                        event: 'hangup',
                        agentExtension: $validated['agent'] ?? '',
                        clientNumber: $validated['client'] ?? '',
                        uniqueid: $validated['uniqueid'] ?? '',
                        linkedid: $validated['linkedid'] ?? null,
                        sessionId: $callSession->session_id,
                        lead: $lead,
                        callDirection: 'outbound',
                        dialstatus: $dialStatus,
                        duration: $duration
                    ));
                    break;
            }

            return response()->json([
                'success' => true,
                'message' => 'Outbound call event processed',
                'data' => [
                    'event' => $validated['event'],
                    'session_id' => $callSession->session_id,
                    'lead_id' => $lead?->id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error processing outbound call event', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error processing outbound call event',
                'error' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
