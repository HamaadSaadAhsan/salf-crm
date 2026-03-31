<?php

namespace App\Jobs;

use App\Models\Task;
use App\Services\GoogleCalendarSyncService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncTaskToCalendar implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [30, 60, 120];

    public function __construct(public Task $task) {}

    public function handle(GoogleCalendarSyncService $service): void
    {
        if (! $this->task->due_at) {
            if ($this->task->google_calendar_event_id) {
                $service->removeTaskFromCalendar($this->task);
            }

            return;
        }

        $service->syncTaskToCalendar($this->task);
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SyncTaskToCalendar job failed', [
            'task_id' => $this->task->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
