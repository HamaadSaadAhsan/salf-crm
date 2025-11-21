<?php

namespace App\Services;

use App\Models\CallLog;
use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Support\Str;

class CallSessionService
{
    /**
     * Create a new call session when a call is initiated
     */
    public function createCallSession(User $caller, string $calleeNumber, ?Lead $lead = null): CallSession
    {
        $callSession = CallSession::create([
            'session_id' => Str::uuid(),
            'caller_id' => $caller->id,
            'caller_number' => $caller->phone ?? $caller->extension,
            'callee_number' => $calleeNumber,
            'lead_id' => $lead?->id,
            'call_direction' => 'outbound',
            'call_type' => 'voice',
            'status' => 'initiated',
            'started_at' => now(),
        ]);

        // Call signature is automatically generated via model boot method
        return $callSession;
    }

    /**
     * Update call session status to ringing
     */
    public function markAsRinging(CallSession $callSession): CallSession
    {
        $callSession->update([
            'status' => 'ringing',
        ]);

        return $callSession->fresh();
    }

    /**
     * Update call session status to connected/answered
     */
    public function markAsConnected(CallSession $callSession): CallSession
    {
        $callSession->update([
            'status' => 'answered',
            'answered_at' => now(),
        ]);

        return $callSession->fresh();
    }

    /**
     * End the call session
     */
    public function endCallSession(CallSession $callSession, string $reason = 'hangup'): CallSession
    {
        $endedAt = now();
        $duration = $callSession->answered_at
            ? $endedAt->diffInSeconds($callSession->answered_at)
            : null;

        $callSession->update([
            'status' => 'ended',
            'ended_at' => $endedAt,
            'duration' => $duration,
            'end_reason' => $reason,
        ]);

        return $callSession->fresh();
    }

    /**
     * Mark call as declined
     */
    public function markAsDeclined(CallSession $callSession): CallSession
    {
        $callSession->update([
            'status' => 'failed',
            'ended_at' => now(),
            'end_reason' => 'declined',
        ]);

        return $callSession->fresh();
    }

    /**
     * Find or create call session by session identifier
     */
    public function findOrCreateBySessionId(string $sessionId, User $caller, string $calleeNumber, ?Lead $lead = null): CallSession
    {
        return CallSession::firstOrCreate(
            ['session_id' => $sessionId],
            [
                'caller_id' => $caller->id,
                'caller_number' => $caller->phone ?? $caller->extension,
                'callee_number' => $calleeNumber,
                'lead_id' => $lead?->id,
                'call_direction' => 'outbound',
                'call_type' => 'voice',
                'status' => 'initiated',
                'started_at' => now(),
            ]
        );
    }

    /**
     * Get call history for a lead
     */
    public function getLeadCallHistory(Lead $lead, int $limit = 50)
    {
        return $lead->callSessions()
            ->with(['caller'])
            ->orderByDesc('started_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Get call statistics for a lead
     */
    public function getLeadCallStatistics(Lead $lead): array
    {
        $calls = $lead->callSessions;

        return [
            'total_calls' => $calls->count(),
            'completed_calls' => $calls->where('status', 'ended')->where('duration', '>', 0)->count(),
            'missed_calls' => $calls->whereIn('end_reason', ['no_answer', 'declined'])->count(),
            'total_duration' => $calls->sum('duration'),
            'average_duration' => $calls->where('duration', '>', 0)->avg('duration'),
            'last_call_at' => $calls->max('started_at'),
        ];
    }

    /**
     * Find a call session by its signature
     */
    public function findBySignature(string $signature): ?CallSession
    {
        return CallSession::where('call_signature', $signature)
            ->with(['caller', 'lead', 'callLogs'])
            ->first();
    }

    /**
     * Generate call signature data without creating database records
     * Used when Node.js server handles call tracking
     * Format: LEAD-{lead_id}-USER-{user_id}-{timestamp}-{random}
     */
    public function generateCallSignature(User $caller, string $calleeNumber, ?Lead $lead = null): array
    {
        $sessionId = Str::uuid()->toString();
        $timestamp = now();

        // Generate call signature using the same format as CallSession model
        // Format: LEAD-{lead_id}-USER-{user_id}-{timestamp}-{random}
        $callSignature = CallSession::generateCallSignature($lead?->id, $caller->id);

        return [
            'call_signature' => $callSignature,
            'session_id' => $sessionId,
            'lead_id' => $lead?->id,
            'caller_id' => $caller->id,
            'caller_number' => $caller->phone ?? $caller->extension,
            'callee_number' => $calleeNumber,
            'timestamp' => $timestamp->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Get the call signature for a session (to be sent to Asterisk)
     */
    public function getCallSignatureForAsterisk(CallSession $callSession): array
    {
        return [
            'call_signature' => $callSession->call_signature,
            'session_id' => $callSession->session_id,
            'lead_id' => $callSession->lead_id,
            'caller_id' => $callSession->caller_id,
            'timestamp' => $callSession->started_at->format('Y-m-d H:i:s'),
        ];
    }

    /**
     * Update recording path using the call signature
     */
    public function updateRecordingPath(string $signature, string $recordingPath): bool
    {
        $callSession = $this->findBySignature($signature);

        if (! $callSession) {
            return false;
        }

        $callSession->update([
            'recording_path' => $recordingPath,
        ]);

        return true;
    }

    /**
     * Create initial call log for the session
     */
    public function createInitialCallLog(CallSession $callSession): CallLog
    {
        return CallLog::createForSession(
            $callSession,
            'info',
            'call_initiated',
            'Outbound call initiated',
            [
                'caller_number' => $callSession->caller_number,
                'callee_number' => $callSession->callee_number,
                'call_signature' => $callSession->call_signature,
                'session_id' => $callSession->session_id,
            ],
            'application'
        );
    }

    /**
     * Create lead activity for the call
     */
    public function createCallActivity(CallSession $callSession): ?LeadActivity
    {
        if (! $callSession->lead_id) {
            return null;
        }

        return LeadActivity::create([
            'lead_id' => $callSession->lead_id,
            'user_id' => $callSession->caller_id,
            'type' => 'call',
            'status' => 'pending',
            'subject' => 'Outbound Call',
            'description' => "Call initiated to {$callSession->callee_number}",
            'metadata' => [
                'call_session_id' => $callSession->id,
                'session_id' => $callSession->session_id,
                'call_signature' => $callSession->call_signature,
                'phone_number' => $callSession->callee_number,
                'call_direction' => 'outbound',
            ],
            'scheduled_at' => now(),
        ]);
    }

    /**
     * Create a complete call session with logs and activity
     */
    public function createCallSessionWithTracking(User $caller, string $calleeNumber, ?Lead $lead = null): array
    {
        $callSession = $this->createCallSession($caller, $calleeNumber, $lead);
        $callLog = $this->createInitialCallLog($callSession);
        $activity = $this->createCallActivity($callSession);

        return [
            'call_session' => $callSession,
            'call_log' => $callLog,
            'activity' => $activity,
        ];
    }
}
