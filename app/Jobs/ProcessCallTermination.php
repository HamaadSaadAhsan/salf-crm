<?php

namespace App\Jobs;

use App\Events\CallEnded;
use App\Models\CallLog;
use App\Models\CallSession;
use App\Services\AsteriskService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessCallTermination implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 2;

    public $timeout = 30;

    public function __construct(
        public CallSession $callSession,
        public string $reason = 'hangup',
        public array $context = []
    ) {}

    public function handle(AsteriskService $asteriskService): void
    {
        try {
            CallLog::createForSession(
                $this->callSession,
                'info',
                'call_termination_started',
                'Processing call termination',
                ['reason' => $this->reason, 'context' => $this->context]
            );

            if ($this->callSession->asterisk_channel_id) {
                $asteriskService->hangupCall($this->callSession->asterisk_channel_id);

                CallLog::createForSession(
                    $this->callSession,
                    'info',
                    'sip_bye',
                    'SIP BYE sent successfully',
                    ['channel_id' => $this->callSession->asterisk_channel_id]
                );
            }

            $this->callSession->markAsEnded($this->reason);

            $this->callSession->participants()->where('status', '!=', 'left')->each(function ($participant) {
                $participant->leave($this->reason);
            });

            CallLog::createForSession(
                $this->callSession,
                'info',
                'call_ended',
                'Call session terminated successfully',
                [
                    'reason' => $this->reason,
                    'duration' => $this->callSession->duration,
                    'answered' => ! is_null($this->callSession->answered_at),
                ]
            );

            CallEnded::dispatch($this->callSession);

            if ($this->callSession->recording_path) {
                ProcessCallRecording::dispatch($this->callSession);
            }

        } catch (\Exception $e) {
            CallLog::createForSession(
                $this->callSession,
                'error',
                'call_termination_failed',
                'Call termination failed: '.$e->getMessage(),
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
            'termination_job_failed',
            'ProcessCallTermination job failed: '.$exception->getMessage(),
            ['exception' => $exception->getTraceAsString()]
        );
    }
}
