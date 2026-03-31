<?php

namespace App\Jobs;

use App\Models\Lead;
use App\Services\GoogleCalendarSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class RemoveLeadFromCalendar implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [30, 60, 120];

    public function __construct(public Lead $lead) {}

    public function handle(GoogleCalendarSyncService $service): void
    {
        $service->removeLeadFromCalendar($this->lead);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('RemoveLeadFromCalendar job failed', [
            'lead_id' => $this->lead->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
