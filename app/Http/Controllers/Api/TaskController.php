<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;

class TaskController extends Controller
{
    /**
     * Get pending task reminders for the authenticated user.
     *
     * Returns tasks that:
     * - Are assigned to the user
     * - Are not completed
     * - Are either overdue, due today, or due within the next 24 hours
     * - Have urgent or high priority
     */
    public function pendingReminders(): AnonymousResourceCollection
    {
        $user = Auth::user();

        $tasks = Task::query()
            ->with(['assignedTo', 'createdBy', 'taskable'])
            ->where('assigned_to_id', $user->id)
            ->pending()
            ->where(function ($query) {
                // Get overdue tasks
                $query->overdue()
                    // Or tasks due today
                    ->orWhere(function ($q) {
                        $q->dueToday();
                    })
                    // Or tasks due within next 24 hours
                    ->orWhere(function ($q) {
                        $q->whereBetween('due_at', [now(), now()->addDay()]);
                    })
                    // Or urgent/high priority tasks due within 48 hours
                    ->orWhere(function ($q) {
                        $q->whereIn('priority', ['urgent', 'high'])
                            ->whereBetween('due_at', [now(), now()->addDays(2)]);
                    });
            })
            ->orderByRaw($this->getTaskPriorityOrderSql())
            ->orderBy('due_at', 'asc')
            ->limit(50)
            ->get();

        return TaskResource::collection($tasks);
    }

    /**
     * Mark a task as complete.
     */
    public function complete(Task $task): JsonResponse
    {
        // Check if user can update this task
        if ($task->assigned_to_id !== Auth::id() && $task->created_by_id !== Auth::id()) {
            abort(403, 'You are not authorized to update this task');
        }

        $task->update([
            'completed_at' => now(),
            'status' => 'completed',
        ]);

        return response()->json([
            'message' => 'Task completed successfully',
            'data' => TaskResource::make($task->load(['assignedTo', 'createdBy'])),
        ]);
    }

    /**
     * Mark a task as incomplete.
     */
    public function incomplete(Task $task): JsonResponse
    {
        // Check if user can update this task
        if ($task->assigned_to_id !== Auth::id() && $task->created_by_id !== Auth::id()) {
            abort(403, 'You are not authorized to update this task');
        }

        $task->update([
            'completed_at' => null,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Task marked as incomplete',
            'data' => TaskResource::make($task->load(['assignedTo', 'createdBy'])),
        ]);
    }

    /**
     * Get the SQL for ordering tasks by priority.
     * Uses database-specific syntax for NOW() function.
     */
    protected function getTaskPriorityOrderSql(): string
    {
        $useSqlite = config('database.default') === 'sqlite' || app()->environment('testing');

        $nowFunction = $useSqlite ? "datetime('now')" : 'NOW()';

        return "
            CASE
                WHEN due_at < {$nowFunction} THEN 1
                WHEN priority = 'urgent' THEN 2
                WHEN priority = 'high' THEN 3
                ELSE 4
            END
        ";
    }
}
