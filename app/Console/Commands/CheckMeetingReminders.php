<?php

namespace App\Console\Commands;

use App\Models\LeadActivity;
use App\Notifications\LeadActivityNotification;
use Illuminate\Console\Command;

class CheckMeetingReminders extends Command
{
    protected $signature = 'meetings:check-reminders';

    protected $description = 'Check for upcoming and overdue meetings and send notifications';

    private const UPCOMING_THRESHOLD = 30; // 30 minutes before meeting

    public function handle(): int
    {
        $this->info('Checking for meeting reminders...');

        $overdueCount = $this->checkOverdueMeetings();
        $upcomingCount = $this->checkUpcomingMeetings();

        $this->info("Reminders dispatched: overdue={$overdueCount}, upcoming={$upcomingCount}");

        return self::SUCCESS;
    }

    protected function checkOverdueMeetings(): int
    {
        $meetings = LeadActivity::query()
            ->with(['user', 'lead'])
            ->where('type', 'meeting')
            ->where('status', 'overdue')
            ->where('scheduled_at', '>=', now()->subDay())
            ->get();

        $count = 0;

        foreach ($meetings as $meeting) {
            $cacheKey = "meeting_reminder_overdue_{$meeting->id}";
            if (cache()->tags(['meeting_reminders'])->get($cacheKey, false)) {
                continue;
            }

            if ($meeting->user) {
                $meeting->user->notify(new LeadActivityNotification($meeting, $meeting->lead, 'overdue'));
            }

            cache()->tags(['meeting_reminders'])->put($cacheKey, true, now()->addHours(4));
            $count++;
        }

        return $count;
    }

    protected function checkUpcomingMeetings(): int
    {
        $meetings = LeadActivity::query()
            ->with(['user', 'lead'])
            ->where('type', 'meeting')
            ->whereIn('status', ['pending', 'overdue'])
            ->whereBetween('scheduled_at', [
                now(),
                now()->addMinutes(self::UPCOMING_THRESHOLD),
            ])
            ->get();

        $count = 0;

        foreach ($meetings as $meeting) {
            $cacheKey = "meeting_reminder_upcoming_{$meeting->id}";
            if (cache()->tags(['meeting_reminders'])->get($cacheKey, false)) {
                continue;
            }

            if ($meeting->user) {
                $meeting->user->notify(new LeadActivityNotification($meeting, $meeting->lead, 'upcoming'));
            }

            cache()->tags(['meeting_reminders'])->put($cacheKey, true, now()->addHours(2));
            $count++;
        }

        return $count;
    }
}
