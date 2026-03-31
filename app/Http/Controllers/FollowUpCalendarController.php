<?php

namespace App\Http\Controllers;

use App\Models\CalendarIntegration;
use App\Models\Lead;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FollowUpCalendarController extends Controller
{
    public function index(Request $request)
    {
        $calendarIntegration = CalendarIntegration::where('user_id', $request->user()->id)->first();

        return inertia('calendar/index', [
            'calendarLinked' => (bool) $calendarIntegration?->is_active,
            'calendarEmail' => $calendarIntegration?->is_active ? $calendarIntegration->google_account_email : null,
        ]);
    }

    public function events(Request $request): JsonResponse
    {
        $request->validate([
            'start' => ['required', 'date'],
            'end' => ['required', 'date'],
        ]);

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');

        $start = $request->date('start');
        $end = $request->date('end');

        // Lead follow-ups
        $leadsQuery = Lead::query()
            ->whereNotNull('next_follow_up_at')
            ->whereBetween('next_follow_up_at', [$start, $end])
            ->with(['assignedTo:id,name', 'service:id,name']);

        if (! $isSuperAdmin) {
            $leadsQuery->where('assigned_to', $user->id);
        }

        $leadEvents = $leadsQuery->get(['id', 'name', 'next_follow_up_at', 'assigned_to', 'service_id', 'inquiry_status', 'priority'])
            ->map(fn (Lead $lead) => [
                'id' => 'lead-'.$lead->id,
                'title' => $lead->name,
                'start' => $lead->next_follow_up_at->toIso8601String(),
                'type' => 'follow_up',
                'extendedProps' => [
                    'leadId' => $lead->id,
                    'assignedTo' => $lead->assignedTo?->name,
                    'service' => $lead->service?->name,
                    'status' => $lead->inquiry_status,
                    'priority' => $lead->priority,
                ],
            ]);

        // Tasks with due dates
        $tasksQuery = Task::query()
            ->whereNotNull('due_at')
            ->whereBetween('due_at', [$start, $end])
            ->with('assignedTo:id,name');

        if (! $isSuperAdmin) {
            $tasksQuery->where('assigned_to_id', $user->id);
        }

        $taskEvents = $tasksQuery->get(['id', 'title', 'due_at', 'type', 'status', 'priority', 'assigned_to_id', 'completed_at'])
            ->map(fn (Task $task) => [
                'id' => 'task-'.$task->id,
                'title' => $task->title,
                'start' => $task->due_at->toIso8601String(),
                'type' => 'task',
                'extendedProps' => [
                    'taskId' => $task->id,
                    'taskType' => $task->type?->value,
                    'assignedTo' => $task->assignedTo?->name,
                    'status' => $task->status?->value,
                    'priority' => $task->priority?->value,
                    'completed' => $task->completed_at !== null,
                ],
            ]);

        return response()->json([
            'events' => $leadEvents->concat($taskEvents)->values(),
        ]);
    }
}
