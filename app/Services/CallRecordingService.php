<?php

namespace App\Services;

use App\Models\CallSession;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CallRecordingService
{
    private string $recordingBaseUrl;

    public function __construct()
    {
        $this->recordingBaseUrl = config('services.asterisk.recording_url', 'http://192.168.100.232/recordz/');
    }

    /**
     * Get recording URL for a call session
     */
    public function getRecordingUrl(CallSession $callSession): ?string
    {
        if (! $callSession->call_signature) {
            return null;
        }

        // Check if recording_path is already stored in database
        if ($callSession->recording_path) {
            return $this->buildRecordingUrl($callSession->recording_path);
        }

        // Try to find recording by signature
        $filename = $this->findRecordingBySignature($callSession->call_signature);

        if ($filename) {
            // Update the call session with the found recording path
            $callSession->update(['recording_path' => $filename]);

            return $this->buildRecordingUrl($filename);
        }

        return null;
    }

    /**
     * Find recording file by call signature
     */
    private function findRecordingBySignature(string $signature): ?string
    {
        // Expected format: LEAD-{lead_id}-USER-{user_id}-{timestamp}-{random}.wav
        $pattern = "{$signature}.wav";

        // Check if file exists at the recording server
        $url = $this->buildRecordingUrl($pattern);

        try {
            $response = Http::timeout(5)->head($url);

            if ($response->successful()) {
                return $pattern;
            }
        } catch (\Exception $e) {
            Log::debug('Recording not found', [
                'signature' => $signature,
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Build full recording URL
     */
    private function buildRecordingUrl(string $filename): string
    {
        return rtrim($this->recordingBaseUrl, '/').'/'.$filename;
    }

    /**
     * Get all recordings for a lead
     */
    public function getLeadRecordings($lead)
    {
        $callSessions = CallSession::where('lead_id', $lead->id)
            ->whereNotNull('call_signature')
            ->orderByDesc('started_at')
            ->get();

        $recordings = [];

        foreach ($callSessions as $callSession) {
            $url = $this->getRecordingUrl($callSession);

            if ($url) {
                $recordings[] = [
                    'call_session_id' => $callSession->id,
                    'session_id' => $callSession->session_id,
                    'call_signature' => $callSession->call_signature,
                    'recording_url' => $url,
                    'started_at' => $callSession->started_at,
                    'duration' => $callSession->duration,
                    'caller' => [
                        'id' => $callSession->caller_id,
                        'name' => $callSession->caller->name ?? null,
                    ],
                ];
            }
        }

        return $recordings;
    }

    /**
     * Check if recording exists for a call session
     */
    public function recordingExists(CallSession $callSession): bool
    {
        return $this->getRecordingUrl($callSession) !== null;
    }

    /**
     * Get recording file content for streaming
     */
    public function streamRecording(CallSession $callSession)
    {
        $url = $this->getRecordingUrl($callSession);

        if (! $url) {
            return null;
        }

        try {
            $response = Http::timeout(30)->get($url);

            if ($response->successful()) {
                return [
                    'content' => $response->body(),
                    'content_type' => $response->header('Content-Type') ?? 'audio/wav',
                    'filename' => basename($callSession->recording_path ?? $callSession->call_signature.'.wav'),
                ];
            }
        } catch (\Exception $e) {
            Log::error('Failed to stream recording', [
                'call_session_id' => $callSession->id,
                'url' => $url,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }
}
