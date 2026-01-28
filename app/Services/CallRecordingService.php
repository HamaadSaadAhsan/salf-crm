<?php

namespace App\Services;

use App\Models\CallSession;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CallRecordingService
{
    private string $recordingDisk = 'local';

    private string $recordingPath = 'private/recordings';

    /**
     * Get recording URL for a call session (API endpoint for streaming)
     */
    public function getRecordingUrl(CallSession $callSession): ?string
    {
        if (! $callSession->call_signature) {
            return null;
        }

        // Check if recording exists
        if (! $this->recordingExists($callSession)) {
            return null;
        }

        // Return API endpoint for streaming
        return route('api.calls.recording', $callSession);
    }

    /**
     * Get the local file path for a recording
     */
    public function getRecordingPath(CallSession $callSession): ?string
    {
        if (! $callSession->call_signature) {
            return null;
        }

        // Check if recording_path is already stored in database
        if ($callSession->recording_path) {
            $filename = basename($callSession->recording_path);

            return $this->recordingPath.'/'.$filename;
        }

        // Try to find recording by signature
        return $this->findRecordingBySignature($callSession->call_signature);
    }

    /**
     * Find recording file by call signature
     */
    private function findRecordingBySignature(string $signature): ?string
    {
        // Check for .wav file
        $wavPath = $this->recordingPath.'/'.$signature.'.wav';
        if (Storage::disk($this->recordingDisk)->exists($wavPath)) {
            return $wavPath;
        }

        // Check for .mp3 file
        $mp3Path = $this->recordingPath.'/'.$signature.'.mp3';
        if (Storage::disk($this->recordingDisk)->exists($mp3Path)) {
            return $mp3Path;
        }

        return null;
    }

    /**
     * Get all recordings for a lead
     */
    public function getLeadRecordings($lead): array
    {
        $callSessions = CallSession::where('lead_id', $lead->id)
            ->whereNotNull('call_signature')
            ->orderByDesc('started_at')
            ->get();

        $recordings = [];

        foreach ($callSessions as $callSession) {
            if ($this->recordingExists($callSession)) {
                $recordings[] = [
                    'call_session_id' => $callSession->id,
                    'session_id' => $callSession->session_id,
                    'call_signature' => $callSession->call_signature,
                    'recording_url' => $this->getRecordingUrl($callSession),
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
        $path = $this->getRecordingPath($callSession);

        return $path !== null && Storage::disk($this->recordingDisk)->exists($path);
    }

    /**
     * Get recording file content for streaming
     */
    public function streamRecording(CallSession $callSession): ?array
    {
        $path = $this->getRecordingPath($callSession);

        if (! $path || ! Storage::disk($this->recordingDisk)->exists($path)) {
            Log::debug('Recording file not found', [
                'call_session_id' => $callSession->id,
                'path' => $path,
            ]);

            return null;
        }

        try {
            $content = Storage::disk($this->recordingDisk)->get($path);
            $filename = basename($path);
            $extension = pathinfo($filename, PATHINFO_EXTENSION);

            $contentType = match ($extension) {
                'wav' => 'audio/wav',
                'mp3' => 'audio/mpeg',
                'ogg' => 'audio/ogg',
                default => 'audio/wav',
            };

            // Update recording_path in database if not set
            if (! $callSession->recording_path) {
                $callSession->updateQuietly(['recording_path' => $filename]);
            }

            return [
                'content' => $content,
                'content_type' => $contentType,
                'filename' => $filename,
            ];
        } catch (\Exception $e) {
            Log::error('Failed to stream recording', [
                'call_session_id' => $callSession->id,
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
        }

        return null;
    }

    /**
     * Get the full filesystem path for a recording (for external tools like ffmpeg)
     */
    public function getFullPath(CallSession $callSession): ?string
    {
        $path = $this->getRecordingPath($callSession);

        if (! $path) {
            return null;
        }

        return Storage::disk($this->recordingDisk)->path($path);
    }
}
