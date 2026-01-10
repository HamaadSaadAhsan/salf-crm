<?php

namespace App\Http\Controllers\Api;

use App\Events\CallStateChanged;
use App\Events\CallStatusChanged;
use App\Http\Controllers\Controller;
use App\Models\CallSession;
use App\Models\Lead;
use App\Services\CallRecordingService;
use App\Services\CallSessionService;
use App\Services\LeadCacheService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallSessionController extends Controller
{
    public function __construct(
        private readonly CallSessionService $callSessionService,
        private readonly LeadCacheService $leadCacheService,
        private readonly CallRecordingService $recordingService
    ) {}

    /**
     * Get active call session for the current user
     * Used to restore call dialog after page refresh
     */
    public function getActiveCall(): JsonResponse
    {
        $user = auth()->user();

        if (! $user || ! $user->extension) {
            return response()->json([
                'success' => true,
                'active_call' => null,
            ]);
        }

        // Find active call session where user is involved (by extension, user id, or answered the call)
        $activeCall = CallSession::query()
            ->where(function ($query) use ($user) {
                // Inbound calls: callee_number is the user's extension
                $query->where('callee_number', $user->extension)
                    // Or outbound calls: caller_id is the user
                    ->orWhere('caller_id', $user->id)
                    // Or user answered the call (coverage call scenario)
                    ->orWhere('answered_by_user_id', $user->id);
            })
            ->whereIn('status', ['ringing', 'answered'])
            ->with(['lead.service', 'lead.assignedTo', 'caller', 'answeredBy', 'intendedFor'])
            ->orderByDesc('started_at')
            ->first();

        if (! $activeCall) {
            return response()->json([
                'success' => true,
                'active_call' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'active_call' => [
                'event' => $activeCall->status === 'answered' ? 'connect' : 'ring',
                'caller' => $activeCall->caller_number,
                'exten' => $activeCall->callee_number,
                'uniqueid' => $activeCall->uniqueid,
                'sessionId' => $activeCall->session_id,
                'call_direction' => $activeCall->call_direction,
                'target_extension' => $activeCall->callee_number,
                'agent_extension' => $activeCall->call_direction === 'outbound' ? $user->extension : null,
                'answered_by_user_id' => $activeCall->answered_by_user_id,
                'intended_for_user_id' => $activeCall->intended_for_user_id,
                'is_coverage_call' => $activeCall->is_coverage_call,
                'started_at' => $activeCall->started_at?->toIso8601String(),
                'answered_at' => $activeCall->answered_at?->toIso8601String(),
                'lead' => $activeCall->lead ? [
                    'id' => $activeCall->lead->id,
                    'name' => $activeCall->lead->name,
                    'email' => $activeCall->lead->email,
                    'phone' => $activeCall->lead->phone,
                    'city' => $activeCall->lead->city,
                    'country' => $activeCall->lead->country,
                    'service' => $activeCall->lead->service ? [
                        'id' => $activeCall->lead->service_id,
                        'name' => $activeCall->lead->service->name,
                    ] : null,
                    'assigned_to' => $activeCall->lead->assignedTo ? [
                        'id' => $activeCall->lead->assigned_to,
                        'name' => $activeCall->lead->assignedTo->name,
                    ] : null,
                    'inquiry_status' => $activeCall->lead->inquiry_status,
                    'priority' => $activeCall->lead->priority,
                    'detail' => $activeCall->lead->detail,
                    'budget' => $activeCall->lead->budget,
                    'tags' => $activeCall->lead->tags,
                    'lead_score' => $activeCall->lead->lead_score,
                    'last_activity_at' => $activeCall->lead->last_activity_at?->toIso8601String(),
                ] : null,
            ],
        ]);
    }

    /**
     * Get call history for a specific lead
     */
    public function leadCallHistory(Lead $lead): JsonResponse
    {
        $calls = $this->callSessionService->getLeadCallHistory($lead);
        $statistics = $this->callSessionService->getLeadCallStatistics($lead);

        return response()->json([
            'calls' => $calls->map(function ($call) {
                return [
                    'id' => $call->id,
                    'session_id' => $call->session_id,
                    'call_signature' => $call->call_signature,
                    'caller' => [
                        'id' => $call->caller?->id,
                        'name' => $call->caller?->name,
                    ],
                    'caller_number' => $call->caller_number,
                    'callee_number' => $call->callee_number,
                    'status' => $call->status,
                    'started_at' => $call->started_at?->toIso8601String(),
                    'answered_at' => $call->answered_at?->toIso8601String(),
                    'ended_at' => $call->ended_at?->toIso8601String(),
                    'duration' => $call->duration,
                    'duration_formatted' => $call->duration ? gmdate('H:i:s', $call->duration) : null,
                    'end_reason' => $call->end_reason,
                    'recording_url' => $this->recordingService->getRecordingUrl($call),
                    'has_recording' => $this->recordingService->recordingExists($call),
                ];
            }),
            'statistics' => $statistics,
        ]);
    }

    /**
     * Get a single call session
     */
    public function show(CallSession $callSession): JsonResponse
    {
        $callSession->load(['caller', 'lead', 'callLogs']);

        return response()->json([
            'call' => $callSession,
        ]);
    }

    /**
     * Store call state from WebSocket
     * NOTE: Database operations are handled by server.js
     * This endpoint only invalidates cache and broadcasts events
     */
    public function storeCallState(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'session_id' => 'required|string',
            'caller_id' => 'required|exists:users,id',
            'caller_number' => 'required|string',
            'callee_number' => 'required|string',
            'lead_id' => 'nullable|exists:leads,id',
            'status' => 'required|in:initiated,ringing,answered,ended,failed',
            'end_reason' => 'nullable|string',
        ]);

        try {
            // Invalidate lead cache if this call involves a lead
            if ($validated['lead_id']) {
                $lead = \App\Models\Lead::find($validated['lead_id']);
                if ($lead) {
                    $this->leadCacheService->invalidateLeadCache($lead);
                }
            }

            // Broadcast real-time event to notify frontend
            broadcast(new CallStateChanged($validated['session_id'], $validated))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Call state event received. Database tracking handled by Node server.',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to process call state event', [
                'error' => $e->getMessage(),
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process call state event',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update call session status
     * NOTE: Database operations are handled by server.js
     * This endpoint only broadcasts events and invalidates cache
     */
    public function updateStatus(Request $request, string $sessionId): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:ringing,answered,ended,declined',
            'end_reason' => 'nullable|string',
            'lead_id' => 'nullable|exists:leads,id',
        ]);

        try {
            // Invalidate lead cache if this call involves a lead
            if ($validated['lead_id']) {
                $lead = \App\Models\Lead::find($validated['lead_id']);
                if ($lead) {
                    $this->leadCacheService->invalidateLeadCache($lead);
                }
            }

            // Broadcast real-time event to notify frontend
            broadcast(new CallStatusChanged(
                $sessionId,
                $validated['status'],
                $validated['lead_id'] ?? null,
                $validated['end_reason'] ?? null
            ))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Call status event received. Database tracking handled by Node server.',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to process call status update', [
                'error' => $e->getMessage(),
                'session_id' => $sessionId,
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to process call status update',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get call session by signature
     */
    public function getBySignature(string $signature): JsonResponse
    {
        try {
            $callSession = $this->callSessionService->findBySignature($signature);

            if (! $callSession) {
                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'call_session' => $callSession,
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to retrieve call by signature', [
                'error' => $e->getMessage(),
                'signature' => $signature,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve call session',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Update recording path for a call session using signature
     * This endpoint will be called by Asterisk after recording is saved
     */
    public function updateRecording(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'call_signature' => 'required|string',
            'recording_path' => 'required|string',
        ]);

        try {
            $success = $this->callSessionService->updateRecordingPath(
                $validated['call_signature'],
                $validated['recording_path']
            );

            if (! $success) {
                return response()->json([
                    'success' => false,
                    'message' => 'Call session not found with provided signature',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Recording path updated successfully',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to update recording path', [
                'error' => $e->getMessage(),
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update recording path',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Initiate an outbound call and generate call signature
     * NOTE: Database insertion is now handled by server.js (Node server)
     * This endpoint only generates call signature and invalidates cache
     * Phone number can be provided directly or retrieved from lead
     */
    public function initiateCall(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone_number' => 'nullable|string',
            'lead_id' => 'nullable|exists:leads,id',
        ]);

        try {
            $user = auth()->user();
            $lead = isset($validated['lead_id']) ? Lead::find($validated['lead_id']) : null;

            // Get phone number from lead if not provided
            $phoneNumber = $validated['phone_number'] ?? $lead?->phone;

            if (! $phoneNumber) {
                return response()->json([
                    'success' => false,
                    'message' => 'Phone number is required. Please provide a phone number or select a lead with a phone number.',
                ], 422);
            }

            // Generate call signature without creating database records
            // Call tracking (sessions, logs) is now handled by server.js
            $signatureData = $this->callSessionService->generateCallSignature(
                $user,
                $phoneNumber,
                $lead
            );

            // Invalidate lead cache to reflect new activity
            if ($lead) {
                $this->leadCacheService->invalidateLeadCache($lead);
            }

            return response()->json([
                'success' => true,
                'signature_data' => $signatureData,
                'message' => 'Call signature generated. Call tracking handled by Node server.',
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to initiate call', [
                'error' => $e->getMessage(),
                'request' => $validated,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all recordings for a lead
     */
    public function leadRecordings(Lead $lead): JsonResponse
    {
        $recordings = $this->recordingService->getLeadRecordings($lead);

        return response()->json([
            'success' => true,
            'recordings' => $recordings,
            'count' => count($recordings),
        ]);
    }

    /**
     * Stream/download a recording file
     */
    public function streamRecording(CallSession $callSession)
    {
        $recording = $this->recordingService->streamRecording($callSession);

        if (! $recording) {
            return response()->json([
                'success' => false,
                'message' => 'Recording not found',
            ], 404);
        }

        return response($recording['content'])
            ->header('Content-Type', $recording['content_type'])
            ->header('Content-Disposition', 'inline; filename="'.$recording['filename'].'"');
    }
}
