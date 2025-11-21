<?php

namespace App\Jobs;

use App\Events\CallRecordingProcessed;
use App\Models\CallLog;
use App\Models\CallSession;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class ProcessCallRecording implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;

    public $timeout = 300; // 5 minutes for processing recording

    public function __construct(
        public CallSession $callSession
    ) {}

    public function handle(): void
    {
        try {
            if (! $this->callSession->recording_path) {
                return;
            }

            CallLog::createForSession(
                $this->callSession,
                'info',
                'recording_processing_started',
                'Processing call recording',
                ['recording_path' => $this->callSession->recording_path]
            );

            $recordingPath = $this->callSession->recording_path;

            if (! Storage::disk('local')->exists($recordingPath)) {
                throw new \Exception("Recording file not found: {$recordingPath}");
            }

            $fileSize = Storage::disk('local')->size($recordingPath);
            $duration = $this->callSession->duration;

            if ($fileSize < 1000) { // Less than 1KB, likely empty
                CallLog::createForSession(
                    $this->callSession,
                    'warning',
                    'recording_empty',
                    'Recording file is too small, likely empty',
                    ['file_size' => $fileSize]
                );

                return;
            }

            $finalPath = 'call_recordings/'.$this->callSession->session_id.'.wav';

            Storage::disk('local')->move($recordingPath, $finalPath);

            $this->callSession->update([
                'recording_path' => $finalPath,
            ]);

            CallLog::createForSession(
                $this->callSession,
                'info',
                'recording_processed',
                'Call recording processed successfully',
                [
                    'final_path' => $finalPath,
                    'file_size' => $fileSize,
                    'duration' => $duration,
                ]
            );

            CallRecordingProcessed::dispatch($this->callSession);

        } catch (\Exception $e) {
            CallLog::createForSession(
                $this->callSession,
                'error',
                'recording_processing_failed',
                'Call recording processing failed: '.$e->getMessage(),
                ['exception' => $e->getTraceAsString()]
            );

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        CallLog::createForSession(
            $this->callSession,
            'error',
            'recording_job_failed',
            'ProcessCallRecording job failed: '.$exception->getMessage(),
            ['exception' => $exception->getTraceAsString()]
        );
    }
}
