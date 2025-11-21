<?php

namespace App\Jobs;

use App\Events\CallInitiated;
use App\Models\CallLog;
use App\Models\CallSession;
use App\Services\AsteriskService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessCallInitiation implements ShouldQueue
{
    use InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;

    public $timeout = 60;

    public function __construct(
        public CallSession $callSession,
        public array $sipData = []
    ) {}

    public function handle(AsteriskService $asteriskService): void
    {
        try {
            CallLog::createForSession(
                $this->callSession,
                'info',
                'call_initiation_started',
                'Processing call initiation',
                ['sip_data' => $this->sipData]
            );

            $channelId = $asteriskService->initiateCall(
                $this->callSession->caller_number,
                $this->callSession->callee_number,
                $this->sipData
            );

            $this->callSession->update([
                'asterisk_channel_id' => $channelId,
                'status' => 'ringing',
                'sip_data' => array_merge($this->callSession->sip_data ?? [], $this->sipData),
            ]);

            CallLog::createForSession(
                $this->callSession,
                'info',
                'sip_invite',
                'SIP INVITE sent successfully',
                ['channel_id' => $channelId]
            );

            CallInitiated::dispatch($this->callSession);

        } catch (\Exception $e) {
            CallLog::createForSession(
                $this->callSession,
                'error',
                'call_initiation_failed',
                'Call initiation failed: '.$e->getMessage(),
                ['exception' => $e->getTraceAsString()]
            );

            $this->callSession->update([
                'status' => 'failed',
                'end_reason' => 'initiation_failed',
                'ended_at' => now(),
            ]);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        CallLog::createForSession(
            $this->callSession,
            'error',
            'job_failed',
            'ProcessCallInitiation job failed: '.$exception->getMessage(),
            ['exception' => $exception->getTraceAsString()]
        );

        $this->callSession->update([
            'status' => 'failed',
            'end_reason' => 'job_failed',
            'ended_at' => now(),
        ]);
    }
}
