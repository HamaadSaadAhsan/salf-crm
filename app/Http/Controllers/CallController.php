<?php

namespace App\Http\Controllers;

use App\Http\Requests\InitiateCallRequest;
use App\Jobs\ProcessCallInitiation;
use App\Jobs\ProcessCallTermination;
use App\Models\CallSession;
use App\Services\CallRecordingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class CallController extends Controller
{
    public function index(Request $request, CallRecordingService $recordingService): Response
    {
        $query = CallSession::with(['caller', 'lead'])
            ->where('caller_id', auth()->id());

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('caller_number', 'like', "%{$search}%")
                    ->orWhere('callee_number', 'like', "%{$search}%")
                    ->orWhereHas('caller', function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('lead', function ($sub) use ($search) {
                        $sub->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($status = $request->string('status')->toString()) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($direction = $request->string('direction')->toString()) {
            if ($direction !== 'all') {
                $query->where('call_direction', $direction);
            }
        }

        if ($type = $request->string('type')->toString()) {
            if ($type !== 'all') {
                $query->where('call_type', $type);
            }
        }

        $callSessions = $query->latest()->paginate(20)->withQueryString();

        // Transform to add recording URLs
        $callSessions->through(function ($call) use ($recordingService) {
            $call->recording_url = $recordingService->getRecordingUrl($call);

            return $call;
        });

        return Inertia::render('calls/index', [
            'callSessions' => $callSessions,
            'stats' => [
                'total_calls' => $callSessions->total(),
                'active_calls' => CallSession::where('caller_id', auth()->id())
                    ->whereIn('status', ['initiated', 'ringing', 'answered'])
                    ->count(),
            ],
            'filters' => [
                'search' => $request->query('search'),
                'status' => $request->query('status', 'all'),
                'direction' => $request->query('direction', 'all'),
                'type' => $request->query('type', 'all'),
            ],
        ]);
    }

    public function store(InitiateCallRequest $request): RedirectResponse
    {
        $callSession = CallSession::create([
            'session_id' => Str::uuid(),
            'caller_id' => auth()->id(),
            'callee_id' => $request->callee_id,
            'call_direction' => 'outbound',
            'call_type' => $request->call_type ?? 'voice',
            'status' => 'initiated',
            'caller_number' => $request->caller_number ?? '',
            'callee_number' => $request->callee_number ?? '',
            'started_at' => now(),
        ]);

        ProcessCallInitiation::dispatch($callSession, $request->sip_data ?? []);

        return redirect()->route('calls.show', $callSession)->with('success', 'Call initiated successfully.');
    }

    public function show(CallSession $callSession): Response
    {
        $this->authorize('view', $callSession);

        $callSession->load([
            'caller',
            'lead',
            'callLogs' => fn ($query) => $query->latest(),
            'participants.user',
        ]);

        return Inertia::render('calls/show', [
            'callSession' => $callSession,
        ]);
    }

    public function answer(CallSession $callSession): JsonResponse
    {
        $this->authorize('update', $callSession);

        if (! in_array($callSession->status, ['initiated', 'ringing'])) {
            return response()->json(['error' => 'Call cannot be answered in current status'], 400);
        }

        $callSession->markAsAnswered();

        return response()->json(['message' => 'Call answered successfully']);
    }

    public function hangup(CallSession $callSession, Request $request): JsonResponse
    {
        $this->authorize('update', $callSession);

        if ($callSession->isCompleted()) {
            return response()->json(['error' => 'Call is already completed'], 400);
        }

        $reason = $request->input('reason', 'hangup');

        ProcessCallTermination::dispatch($callSession, $reason);

        return response()->json(['message' => 'Call hangup initiated']);
    }

    public function hold(CallSession $callSession): JsonResponse
    {
        $this->authorize('update', $callSession);

        if ($callSession->status !== 'answered') {
            return response()->json(['error' => 'Call must be answered to hold'], 400);
        }

        // Update status to indicate hold
        $callSession->update(['status' => 'on_hold']);

        return response()->json(['message' => 'Call placed on hold']);
    }

    public function unhold(CallSession $callSession): JsonResponse
    {
        $this->authorize('update', $callSession);

        if ($callSession->status !== 'on_hold') {
            return response()->json(['error' => 'Call is not on hold'], 400);
        }

        $callSession->update(['status' => 'answered']);

        return response()->json(['message' => 'Call resumed from hold']);
    }

    public function mute(CallSession $callSession, Request $request): JsonResponse
    {
        $this->authorize('update', $callSession);

        $participantId = $request->input('participant_id');

        if ($participantId) {
            $participant = $callSession->participants()->findOrFail($participantId);
            $participant->mute();
        }

        return response()->json(['message' => 'Participant muted']);
    }

    public function unmute(CallSession $callSession, Request $request): JsonResponse
    {
        $this->authorize('update', $callSession);

        $participantId = $request->input('participant_id');

        if ($participantId) {
            $participant = $callSession->participants()->findOrFail($participantId);
            $participant->unmute();
        }

        return response()->json(['message' => 'Participant unmuted']);
    }

    public function startRecording(CallSession $callSession): JsonResponse
    {
        $this->authorize('update', $callSession);

        if ($callSession->status !== 'answered') {
            return response()->json(['error' => 'Call must be answered to start recording'], 400);
        }

        // In a real implementation, you would call the Asterisk service
        // For now, we'll just update the session to indicate recording has started
        $recordingPath = 'recordings/'.$callSession->session_id.'_'.time().'.wav';
        $callSession->update(['recording_path' => $recordingPath]);

        return response()->json([
            'message' => 'Recording started',
            'recording_path' => $recordingPath,
        ]);
    }

    public function stopRecording(CallSession $callSession): JsonResponse
    {
        $this->authorize('update', $callSession);

        if (! $callSession->recording_path) {
            return response()->json(['error' => 'No active recording found'], 400);
        }

        return response()->json(['message' => 'Recording stopped']);
    }

    //    public function history(): Response
    //    {
    //        $callHistory = CallSession::with(['caller', 'callee'])
    //            ->where(function ($query) {
    //                $query->where('caller_id', auth()->id())
    //                    ->orWhere('callee_id', auth()->id());
    //            })
    //            ->whereIn('status', ['ended', 'failed', 'cancelled'])
    //            ->latest()
    //            ->paginate(50);
    //
    //        $stats = [
    //            'total_calls' => $callHistory->total(),
    //            'answered_calls' => CallSession::where(function ($query) {
    //                $query->where('caller_id', auth()->id())
    //                    ->orWhere('callee_id', auth()->id());
    //            })->whereNotNull('answered_at')->count(),
    //            'average_duration' => CallSession::where(function ($query) {
    //                $query->where('caller_id', auth()->id())
    //                    ->orWhere('callee_id', auth()->id());
    //            })->whereNotNull('duration')->avg('duration'),
    //        ];
    //
    //        return Inertia::render('calls/history', [
    //            'callHistory' => $callHistory,
    //            'stats' => $stats,
    //        ]);
    //    }
}
