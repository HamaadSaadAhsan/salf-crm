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
                // Call was answered - just update status
                if ($callSession) {
                    $callSession->update([
                        'status' => 'answered',
                        'answered_at' => now(),
                    ]);

                    Log::info('Inbound call answered', [
                        'call_session_id' => $callSession->id,
                        'extension' => $exten,
                        'lead_found' => $lead !== null,
                    ]);
                }
            } elseif ($validated['event'] === 'hangup') {
                // Call ended - update recording path if call was answered
                if ($callSession && $callSession->call_signature) {
                    $recordingFilename = "{$callSession->call_signature}.wav";

                    // Calculate duration: ensure positive integer value
                    $duration = null;
                    if ($callSession->answered_at) {
                        $duration = abs($callSession->answered_at->diffInSeconds(now()));
                    }

                    $callSession->update([
                        'status' => 'ended',
                        'ended_at' => now(),
                        'duration' => $duration,
                        'recording_path' => $recordingFilename,
                    ]);

                    Log::info('Inbound call ended, recording path updated', [
                        'call_session_id' => $callSession->id,
                        'recording_path' => $recordingFilename,
                        'duration' => $duration,
                    ]);
                }
            }

            // Broadcast the event to connected users
            broadcast(new InboundCallReceived(
                event: $validated['event'],
                caller: $validated['caller'],
                exten: $exten,
                uniqueid: $validated['uniqueid'],
                linkedid: $validated['linkedid'] ?? null,
                lead: $lead
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
}
