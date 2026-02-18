<?php

namespace App\Http\Controllers\Api;

use App\Events\CallAnswered;
use App\Events\CallEnded;
use App\Events\CallInitiated;
use App\Http\Controllers\Controller;
use App\Http\Requests\InitiateCallRequest;
use App\Models\CallSession;
use App\Models\Lead;
use App\Services\AsteriskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CallController extends Controller
{
    public function __construct(
        protected AsteriskService $asteriskService
    ) {}

    /**
     * Initiate a new call
     */
    public function initiate(InitiateCallRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $lead = Lead::findOrFail($request->lead_id);

            // Create call session
            $callSession = CallSession::create([
                'caller_id' => $request->caller_id,
                'callee_number' => $lead->phone,
                'status' => 'initiated',
                'call_direction' => 'outbound',
                'call_type' => $request->call_type ?? 'voice',
                'started_at' => now(),
            ]);

            DB::commit();

            // Broadcast event
            broadcast(new CallInitiated($callSession))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Call initiated successfully',
                'data' => [
                    'call_session' => $callSession->load(['caller', 'callee']),
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Call initiation failed', [
                'error' => $e->getMessage(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to initiate call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Answer an incoming call
     */
    public function answer(string $id): JsonResponse
    {
        try {
            $callSession = CallSession::findOrFail($id);

            // Verify user is the caller (only caller can control outbound calls)
            if ($callSession->caller_id !== auth()->id()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to answer this call',
                ], 403);
            }

            // Answer call with Asterisk
            $this->asteriskService->answerCall($callSession->channel_id);

            // Update call session
            $callSession->update([
                'status' => 'active',
                'answered_at' => now(),
            ]);

            // Broadcast event
            broadcast(new CallAnswered($callSession))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Call answered successfully',
                'data' => [
                    'call_session' => $callSession->fresh(['caller', 'callee']),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Call answer failed', [
                'call_session_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to answer call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Hangup a call
     */
    public function hangup(string $id): JsonResponse
    {
        try {
            $callSession = CallSession::findOrFail($id);

            // Verify user is the caller
            if (auth()->id() !== $callSession->caller_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to hangup this call',
                ], 403);
            }

            // Hangup call with Asterisk
            $this->asteriskService->hangupCall($callSession->channel_id);

            // Update call session
            $callSession->update([
                'status' => 'ended',
                'ended_at' => now(),
                'duration' => $callSession->answered_at
                    ? now()->diffInSeconds($callSession->answered_at)
                    : 0,
            ]);

            // Broadcast event
            broadcast(new CallEnded($callSession))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Call ended successfully',
                'data' => [
                    'call_session' => $callSession->fresh(['caller', 'callee']),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Call hangup failed', [
                'call_session_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to hangup call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Mute a call
     */
    public function mute(string $id): JsonResponse
    {
        try {
            $callSession = CallSession::findOrFail($id);

            // Verify user is participant
            if (auth()->id() !== $callSession->caller_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to mute this call',
                ], 403);
            }

            // Mute call with Asterisk
            $this->asteriskService->muteCall($callSession->channel_id);

            return response()->json([
                'success' => true,
                'message' => 'Call muted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Call mute failed', [
                'call_session_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to mute call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Unmute a call
     */
    public function unmute(string $id): JsonResponse
    {
        try {
            $callSession = CallSession::findOrFail($id);

            // Verify user is participant
            if (auth()->id() !== $callSession->caller_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to unmute this call',
                ], 403);
            }

            // Unmute call with Asterisk
            $this->asteriskService->unmuteCall($callSession->channel_id);

            return response()->json([
                'success' => true,
                'message' => 'Call unmuted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Call unmute failed', [
                'call_session_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to unmute call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Put call on hold
     */
    public function hold(string $id): JsonResponse
    {
        try {
            $callSession = CallSession::findOrFail($id);

            // Verify user is participant
            if (auth()->id() !== $callSession->caller_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to hold this call',
                ], 403);
            }

            // Hold call with Asterisk
            $this->asteriskService->holdCall($callSession->channel_id);

            // Update call session
            $callSession->update(['status' => 'on_hold']);

            return response()->json([
                'success' => true,
                'message' => 'Call put on hold successfully',
                'data' => [
                    'call_session' => $callSession->fresh(['caller', 'callee']),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Call hold failed', [
                'call_session_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to hold call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Resume call from hold
     */
    public function resume(string $id): JsonResponse
    {
        try {
            $callSession = CallSession::findOrFail($id);

            // Verify user is participant
            if (auth()->id() !== $callSession->caller_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to resume this call',
                ], 403);
            }

            // Unhold call with Asterisk
            $this->asteriskService->unholdCall($callSession->channel_id);

            // Update call session
            $callSession->update(['status' => 'active']);

            return response()->json([
                'success' => true,
                'message' => 'Call resumed successfully',
                'data' => [
                    'call_session' => $callSession->fresh(['caller', 'callee']),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Call resume failed', [
                'call_session_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to resume call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Transfer call to another user
     */
    public function transfer(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'target_user_id' => 'required|exists:users,id',
        ]);

        try {
            $callSession = CallSession::findOrFail($id);

            // Verify user is participant
            if (auth()->id() !== $callSession->caller_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to transfer this call',
                ], 403);
            }

            // TODO: Implement call transfer logic with Asterisk
            // This requires creating a new channel and bridging

            return response()->json([
                'success' => true,
                'message' => 'Call transfer initiated',
                'data' => [
                    'call_session' => $callSession->fresh(['caller', 'callee']),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Call transfer failed', [
                'call_session_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to transfer call',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get recent calls for authenticated user
     */
    public function getRecent(Request $request): JsonResponse
    {
        try {
            $query = CallSession::query()
                ->where('caller_id', auth()->id())
                ->with(['caller', 'lead'])
                ->orderBy('created_at', 'desc');

            // Optional filters
            if ($request->filled('status')) {
                $query->where('status', $request->status);
            }

            if ($request->filled('direction')) {
                $query->where('direction', $request->direction);
            }

            if ($request->filled('limit')) {
                $query->limit($request->integer('limit', 50));
            } else {
                $query->limit(50);
            }

            $calls = $query->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'calls' => $calls,
                    'count' => $calls->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Get recent calls failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recent calls',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get active call sessions for authenticated user
     */
    public function getActive(): JsonResponse
    {
        try {
            $activeCalls = CallSession::query()
                ->where('caller_id', auth()->id())
                ->whereIn('status', ['initiated', 'ringing', 'active', 'on_hold'])
                ->with(['caller', 'lead'])
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'active_calls' => $activeCalls,
                    'count' => $activeCalls->count(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Get active calls failed', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch active calls',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get call session details
     */
    public function show(string $id): JsonResponse
    {
        try {
            $callSession = CallSession::with(['caller', 'callee', 'participants'])
                ->findOrFail($id);

            // Verify user is participant
            if (auth()->id() !== $callSession->caller_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to view this call',
                ], 403);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'call_session' => $callSession,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Get call session failed', [
                'call_session_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch call session',
                'error' => $e->getMessage(),
            ], 404);
        }
    }
}
