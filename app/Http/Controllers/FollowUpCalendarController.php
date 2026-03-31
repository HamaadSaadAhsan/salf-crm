<?php

namespace App\Http\Controllers;

use App\Events\TaskCreated;
use App\Jobs\SyncLeadToCalendar;
use App\Jobs\SyncTaskToCalendar;
use App\Models\CalendarIntegration;
use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

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

    public function storeTask(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_at' => ['required', 'date'],
            'priority' => ['nullable', 'in:low,medium,high,urgent'],
            'type' => ['nullable', 'in:follow_up,call,message,meeting,email,other'],
            'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $task = Task::query()->create([
            ...$validated,
            'status' => 'pending',
            'priority' => $validated['priority'] ?? 'medium',
            'type' => $validated['type'] ?? 'follow_up',
            'created_by_id' => $request->user()->id,
            'assigned_to_id' => $validated['assigned_to_id'] ?? $request->user()->id,
        ]);

        $task->load('assignedTo:id,name,email');

        broadcast(new TaskCreated($task));

        Cache::tags(['tasks'])->flush();

        SyncTaskToCalendar::dispatch($task);

        return response()->json(['success' => true, 'task' => $task], 201);
    }

    public function storeFollowUp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lead_id' => ['required', 'exists:leads,id'],
            'next_follow_up_at' => ['required', 'date'],
        ]);

        $lead = Lead::findOrFail($validated['lead_id']);

        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');

        if (! $isSuperAdmin && $lead->assigned_to !== $user->id) {
            return response()->json(['message' => 'You can only set follow-ups for your own leads.'], 403);
        }

        $lead->updateQuietly(['next_follow_up_at' => $validated['next_follow_up_at']]);

        $lead->refresh();

        if ($lead->next_follow_up_at && $lead->assigned_to) {
            SyncLeadToCalendar::dispatch($lead);
        }

        return response()->json(['success' => true, 'lead' => $lead->only(['id', 'name', 'next_follow_up_at'])]);
    }

    public function users(): JsonResponse
    {
        $users = cache()->tags(['users'])->remember('users:list:calendar', 600, fn () => User::query()
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get()
        );

        return response()->json(['users' => $users]);
    }

    public function leads(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user->hasRole('super-admin');

        $query = Lead::query()
            ->select(['id', 'name', 'assigned_to'])
            ->orderBy('name');

        if (! $isSuperAdmin) {
            $query->where('assigned_to', $user->id);
        }

        if ($request->has('search')) {
            $query->where('name', 'ilike', '%'.$request->input('search').'%');
        }

        return response()->json(['leads' => $query->limit(50)->get()]);
    }
}
