<?php

namespace App\Http\Controllers;

use App\Events\TaskCreated;
use App\Events\TaskDeleted;
use App\Events\TaskUpdated;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use App\Services\LeadCacheService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function __construct(
        private LeadCacheService $leadCacheService
    ) {}

    public function index(Request $request): Response
    {
        $filter = $request->query('filter', 'all');
        $status = $request->input('status');
        $priority = $request->input('priority');
        $assignedToId = $request->input('assigned_to_id');
        $search = $request->input('search');

        // Build cache key based on all query parameters
        $cacheKey = $this->buildTasksCacheKey($filter, $status, $priority, $assignedToId, $search);

        // Determine cache tags based on filter
        $cacheTags = $this->getTasksCacheTags($filter);

        // Use flexible caching with stale-while-revalidate pattern
        // Fresh for 30 seconds, stale for 5 minutes
        $tasks = cache()->tags($cacheTags)->flexible(
            $cacheKey,
            [30, 300],
            function () use ($filter, $status, $priority, $assignedToId, $search) {
                return $this->fetchTasks($filter, $status, $priority, $assignedToId, $search);
            }
        );

        // Cache users list with memo pattern (request-scoped)
        $users = cache()->tags(['users'])->remember('users:list', 600, fn () => User::query()
            ->select(['id', 'name', 'email'])
            ->orderBy('name')
            ->get()
        );

        return Inertia::render('tasks/index', [
            'tasks' => $tasks,
            'users' => $users,
            'filter' => $filter,
        ]);
    }

    protected function buildTasksCacheKey(
        string $filter,
        ?string $status,
        ?string $priority,
        ?int $assignedToId,
        ?string $search
    ): string {
        $parts = ['tasks', $filter];

        if ($status) {
            $parts[] = "status:{$status}";
        }

        if ($priority) {
            $parts[] = "priority:{$priority}";
        }

        if ($assignedToId) {
            $parts[] = "assigned:{$assignedToId}";
        }

        if ($search) {
            $parts[] = 'search:'.md5($search);
        }

        return implode(':', $parts);
    }

    protected function getTasksCacheTags(string $filter): array
    {
        $tags = ['tasks'];

        if (in_array($filter, ['today', 'week', 'completed', 'overdue'])) {
            $tags[] = "tasks:{$filter}";
        }

        return $tags;
    }

    protected function fetchTasks(
        string $filter,
        ?string $status,
        ?string $priority,
        ?int $assignedToId,
        ?string $search
    ): array {
        $query = Task::query()
            ->with(['assignedTo:id,name,email'])
            ->latest('id');

        // Apply filter parameter
        if ($filter === 'today') {
            $query->dueToday();
        } elseif ($filter === 'week') {
            $query->dueThisWeek();
        } elseif ($filter === 'completed') {
            $query->completed();
        } elseif ($filter === 'overdue') {
            $query->overdue();
        } else {
            $query->pending();
        }

        // Apply additional filters
        if ($status) {
            $query->status($status);
        }

        if ($priority) {
            $query->priority($priority);
        }

        if ($assignedToId) {
            $query->where('assigned_to_id', $assignedToId);
        }

        // Search
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $query->limit(100)->get()->map(function (Task $task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'due_at' => $task->due_at?->toISOString(),
                'completed_at' => $task->completed_at?->toISOString(),
                'assigned_to' => $task->assignedTo ? [
                    'id' => $task->assignedTo->id,
                    'name' => $task->assignedTo->name,
                    'email' => $task->assignedTo->email,
                ] : null,
                'created_at' => $task->created_at->toISOString(),
                'updated_at' => $task->updated_at->toISOString(),
            ];
        })->toArray();
    }

    public function store(StoreTaskRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $validated['status'] = $validated['status'] ?? 'pending';
        $validated['priority'] = $validated['priority'] ?? 'medium';
        $validated['type'] = $validated['type'] ?? 'follow_up';

        // Extract collaborators before creating task
        $collaborators = $validated['collaborators'] ?? [];
        unset($validated['collaborators']);

        $task = Task::query()->create($validated);

        // Sync collaborators if provided
        if (! empty($collaborators)) {
            $task->collaborators()->sync($collaborators);
        }

        // Load relationships for broadcasting
        $task->load(['assignedTo:id,name,email', 'collaborators:id,name,email']);

        // Broadcast task created event
        broadcast(new TaskCreated($task));

        // Invalidate task caches
        $this->invalidateTasksCache();

        // Invalidate lead cache if the task is for a lead
        $this->invalidateLeadCacheIfNeeded($task);

        return redirect()->back()->with('success', 'Task created successfully');
    }

    public function show(Task $task): Response
    {
        $task->load(['assignedTo:id,name,email']);

        return Inertia::render('tasks/show', [
            'task' => array_merge($task->toArray(), [
                'assigned_to' => $task->assignedTo ? [
                    'id' => $task->assignedTo->id,
                    'name' => $task->assignedTo->name,
                    'email' => $task->assignedTo->email,
                ] : null,
            ]),
        ]);
    }

    public function update(UpdateTaskRequest $request, Task $task): RedirectResponse
    {
        $validated = $request->validated();

        // Extract collaborators before updating task
        $collaborators = $validated['collaborators'] ?? null;
        unset($validated['collaborators']);

        $task->update($validated);

        // Sync collaborators if provided
        if ($collaborators !== null) {
            $task->collaborators()->sync($collaborators);
        }

        // Load relationships for broadcasting
        $task->load(['assignedTo:id,name,email', 'collaborators:id,name,email']);

        // Broadcast task updated event
        broadcast(new TaskUpdated($task));

        // Invalidate task caches
        $this->invalidateTasksCache();

        // Invalidate lead cache if the task is for a lead
        $this->invalidateLeadCacheIfNeeded($task);

        return redirect()->back()->with('success', 'Task updated successfully');
    }

    public function destroy(Task $task): RedirectResponse
    {
        // Capture task data before deletion for broadcasting and cache invalidation
        $taskId = $task->id;
        $assignedToId = $task->assigned_to_id;
        $taskableType = $task->taskable_type;
        $taskableId = $task->taskable_id;

        $task->delete();

        // Broadcast task deleted event
        broadcast(new TaskDeleted($taskId, $assignedToId));

        // Invalidate task caches
        $this->invalidateTasksCache();

        // Invalidate lead cache if the task was for a lead
        if ($taskableType === Lead::class && $taskableId) {
            $lead = Lead::find($taskableId);
            if ($lead) {
                $this->leadCacheService->invalidateLeadCache($lead);
            }
        }

        return redirect()->back()->with('success', 'Task deleted successfully');
    }

    public function complete(Task $task): RedirectResponse
    {
        if ($task->completed_at) {
            $task->update([
                'completed_at' => null,
                'status' => 'pending',
            ]);

            // Load relationships for broadcasting
            $task->load(['assignedTo:id,name,email']);

            // Broadcast task updated event
            broadcast(new TaskUpdated($task));

            // Invalidate task caches
            $this->invalidateTasksCache();

            // Invalidate lead cache if the task is for a lead
            $this->invalidateLeadCacheIfNeeded($task);

            return redirect()->back()->with('success', 'Task marked as incomplete');
        }

        $task->update([
            'completed_at' => now(),
            'status' => 'completed',
        ]);

        // Load relationships for broadcasting
        $task->load(['assignedTo:id,name,email']);

        // Broadcast task updated event
        broadcast(new TaskUpdated($task));

        // Invalidate task caches (including completed cache)
        $this->invalidateTasksCache();

        // Invalidate lead cache if the task is for a lead
        $this->invalidateLeadCacheIfNeeded($task);

        return redirect()->back()->with('success', 'Task completed successfully');
    }

    protected function invalidateTasksCache(): void
    {
        // Flush all task-related cache tags
        cache()->tags(['tasks'])->flush();
        cache()->tags(['tasks:today'])->flush();
        cache()->tags(['tasks:week'])->flush();
        cache()->tags(['tasks:completed'])->flush();
        cache()->tags(['tasks:overdue'])->flush();
    }

    protected function invalidateLeadCacheIfNeeded(Task $task): void
    {
        // Only invalidate lead cache if the task belongs to a lead
        if ($task->taskable_type === Lead::class && $task->taskable_id) {
            $lead = Lead::find($task->taskable_id);
            if ($lead) {
                $this->leadCacheService->invalidateLeadCache($lead);
            }
        }
    }
}
