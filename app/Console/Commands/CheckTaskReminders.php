<?php

namespace App\Console\Commands;

use App\Events\TaskDueReminder;
use App\Events\TaskOverdue;
use App\Models\Task;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class CheckTaskReminders extends Command
{
    protected $signature = 'tasks:check-reminders';

    protected $description = 'Check for tasks that need reminders and dispatch events';

    /**
     * Reminder thresholds in minutes
     */
    private const URGENT_THRESHOLD = 30;  // 30 minutes before due

    private const SOON_THRESHOLD = 120;   // 2 hours before due

    public function handle(): int
    {
        $this->info('Checking for tasks that need reminders...');

        $overdueCount = $this->checkOverdueTasks();
        $urgentCount = $this->checkUrgentTasks();
        $soonCount = $this->checkUpcomingTasks();

        $this->info('Reminders dispatched:');
        $this->line("  - Overdue tasks: {$overdueCount}");
        $this->line("  - Urgent tasks (< 30 min): {$urgentCount}");
        $this->line("  - Upcoming tasks (< 2 hours): {$soonCount}");

        return self::SUCCESS;
    }

    protected function checkOverdueTasks(): int
    {
        // Use flexible cache for task queries (fresh: 1min, stale: 5min)
        $tasks = cache()->tags(['task_reminders', 'overdue_tasks'])->flexible(
            'task_reminders:overdue:'.now()->format('Y-m-d-H-i'),
            [60, 300],
            fn () => Task::query()
                ->with(['assignedTo'])
                ->pending()
                ->overdue()
                ->get()
        );

        $count = 0;

        foreach ($tasks as $task) {
            // Check if reminder was already sent
            $alreadySent = cache()->tags(['task_reminders'])->get("task_reminder_overdue_{$task->id}", false);

            if ($alreadySent) {
                continue;
            }

            broadcast(new TaskOverdue($task));

            // Mark as sent for 4 hours
            cache()->tags(['task_reminders'])->put(
                "task_reminder_overdue_{$task->id}",
                true,
                now()->addHours(4)
            );

            $count++;
        }

        return $count;
    }

    protected function checkUrgentTasks(): int
    {
        // Use flexible cache for task queries (fresh: 30sec, stale: 3min)
        $tasks = cache()->tags(['task_reminders', 'urgent_tasks'])->flexible(
            'task_reminders:urgent:'.now()->format('Y-m-d-H-i'),
            [30, 180],
            fn () => Task::query()
                ->with(['assignedTo'])
                ->pending()
                ->whereBetween('due_at', [
                    now(),
                    now()->addMinutes(self::URGENT_THRESHOLD),
                ])
                ->get()
        );

        $count = 0;

        foreach ($tasks as $task) {
            // Check if reminder was already sent
            $alreadySent = cache()->tags(['task_reminders'])->get("task_reminder_urgent_{$task->id}", false);

            if ($alreadySent) {
                continue;
            }

            broadcast(new TaskDueReminder($task, 'urgent'));

            // Mark as sent for 30 minutes
            cache()->tags(['task_reminders'])->put(
                "task_reminder_urgent_{$task->id}",
                true,
                now()->addMinutes(30)
            );

            $count++;
        }

        return $count;
    }

    protected function checkUpcomingTasks(): int
    {
        // Use flexible cache for task queries (fresh: 1min, stale: 5min)
        $tasks = cache()->tags(['task_reminders', 'upcoming_tasks'])->flexible(
            'task_reminders:upcoming:'.now()->format('Y-m-d-H-i'),
            [60, 300],
            fn () => Task::query()
                ->with(['assignedTo'])
                ->pending()
                ->whereBetween('due_at', [
                    now()->addMinutes(self::URGENT_THRESHOLD),
                    now()->addMinutes(self::SOON_THRESHOLD),
                ])
                ->get()
        );

        $count = 0;

        foreach ($tasks as $task) {
            // Check if reminder was already sent
            $alreadySent = cache()->tags(['task_reminders'])->get("task_reminder_soon_{$task->id}", false);

            if ($alreadySent) {
                continue;
            }

            broadcast(new TaskDueReminder($task, 'due_soon'));

            // Mark as sent for 2 hours
            cache()->tags(['task_reminders'])->put(
                "task_reminder_soon_{$task->id}",
                true,
                now()->addHours(2)
            );

            $count++;
        }

        return $count;
    }
}
