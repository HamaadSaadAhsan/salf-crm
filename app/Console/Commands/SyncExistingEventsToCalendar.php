<?php

namespace App\Console\Commands;

use App\Jobs\SyncLeadToCalendar;
use App\Jobs\SyncTaskToCalendar;
use App\Models\Lead;
use App\Models\Task;
use Illuminate\Console\Command;

class SyncExistingEventsToCalendar extends Command
{
    protected $signature = 'calendar:sync-existing
                            {--leads : Sync only lead follow-ups}
                            {--tasks : Sync only tasks}';

    protected $description = 'Sync existing lead follow-ups and tasks to Google Calendar';

    public function handle(): int
    {
        $syncLeads = $this->option('leads') || ! $this->option('tasks');
        $syncTasks = $this->option('tasks') || ! $this->option('leads');

        if ($syncLeads) {
            $this->syncLeads();
        }

        if ($syncTasks) {
            $this->syncTasks();
        }

        $this->info('Done! Events will be synced in the background via queued jobs.');

        return self::SUCCESS;
    }

    private function syncLeads(): void
    {
        $leads = Lead::query()
            ->whereNotNull('next_follow_up_at')
            ->where('next_follow_up_at', '>=', now())
            ->whereNotNull('assigned_to')
            ->whereNull('google_calendar_event_id')
            ->get();

        $this->info("Dispatching sync for {$leads->count()} lead follow-ups...");

        $bar = $this->output->createProgressBar($leads->count());

        foreach ($leads as $lead) {
            SyncLeadToCalendar::dispatch($lead);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
    }

    private function syncTasks(): void
    {
        $tasks = Task::query()
            ->whereNotNull('due_at')
            ->where('due_at', '>=', now())
            ->whereNotNull('assigned_to_id')
            ->whereNull('google_calendar_event_id')
            ->where('status', '!=', 'completed')
            ->where('status', '!=', 'cancelled')
            ->get();

        $this->info("Dispatching sync for {$tasks->count()} tasks...");

        $bar = $this->output->createProgressBar($tasks->count());

        foreach ($tasks as $task) {
            SyncTaskToCalendar::dispatch($task);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
    }
}
