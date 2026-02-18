<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\Service;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2|max:100',
        ]);

        $q = $request->string('q')->trim()->toString();

        return response()->json([
            'leads' => $this->searchLeads($q),
            'tasks' => $this->searchTasks($q),
            'users' => $this->searchUsers($q),
            'services' => $this->searchServices($q),
            'activities' => $this->searchActivities($q),
        ]);
    }

    /**
     * @return array<int, array{id: string, label: string, meta: string, url: string}>
     */
    private function searchLeads(string $q): array
    {
        $useScout = config('scout.driver') === 'meilisearch';

        if ($useScout) {
            try {
                $leads = Lead::search($q)->take(5)->get();
            } catch (\Throwable) {
                $leads = collect();
            }
        } else {
            $leads = Lead::query()
                ->select('id', 'name', 'email', 'phone')
                ->fullTextSearch($q)
                ->limit(5)
                ->get();
        }

        return $leads->map(fn (Lead $lead) => [
            'id' => $lead->id,
            'label' => $lead->name,
            'meta' => $lead->email ?? $lead->phone ?? '',
            'url' => "/leads/{$lead->id}",
        ])->values()->all();
    }

    /**
     * @return array<int, array{id: int, label: string, meta: string, url: string}>
     */
    private function searchTasks(string $q): array
    {
        $tasks = Task::query()
            ->select('id', 'title', 'description', 'taskable_type', 'taskable_id', 'status')
            ->where(function ($query) use ($q) {
                $query->where('title', 'ilike', "%{$q}%")
                    ->orWhere('description', 'ilike', "%{$q}%");
            })
            ->limit(5)
            ->get();

        return $tasks->map(function (Task $task) {
            $url = '#';

            if ($task->taskable_type === Lead::class && $task->taskable_id) {
                $url = "/leads/{$task->taskable_id}";
            }

            return [
                'id' => $task->id,
                'label' => $task->title,
                'meta' => $task->status?->value ?? '',
                'url' => $url,
            ];
        })->values()->all();
    }

    /**
     * @return array<int, array{id: int, label: string, meta: string, url: string}>
     */
    private function searchUsers(string $q): array
    {
        $users = User::query()
            ->select('id', 'name', 'email', 'extension')
            ->where(function ($query) use ($q) {
                $query->where('name', 'ilike', "%{$q}%")
                    ->orWhere('email', 'ilike', "%{$q}%")
                    ->orWhere('extension', 'ilike', "%{$q}%");
            })
            ->limit(5)
            ->get();

        return $users->map(fn (User $user) => [
            'id' => $user->id,
            'label' => $user->name,
            'meta' => $user->email,
            'url' => "/users/{$user->id}",
        ])->values()->all();
    }

    /**
     * @return array<int, array{id: int, label: string, meta: string, url: string}>
     */
    private function searchServices(string $q): array
    {
        $services = Service::query()
            ->select('id', 'name', 'detail', 'country_name')
            ->where(function ($query) use ($q) {
                $query->where('name', 'ilike', "%{$q}%")
                    ->orWhere('detail', 'ilike', "%{$q}%")
                    ->orWhere('country_name', 'ilike', "%{$q}%");
            })
            ->limit(5)
            ->get();

        return $services->map(fn (Service $service) => [
            'id' => $service->id,
            'label' => $service->name,
            'meta' => $service->country_name ?? '',
            'url' => '#',
        ])->values()->all();
    }

    /**
     * @return array<int, array{id: string, label: string, meta: string, url: string}>
     */
    private function searchActivities(string $q): array
    {
        $activities = LeadActivity::query()
            ->select('id', 'lead_id', 'subject', 'description', 'notes', 'type')
            ->where(function ($query) use ($q) {
                $query->where('subject', 'ilike', "%{$q}%")
                    ->orWhere('description', 'ilike', "%{$q}%")
                    ->orWhere('notes', 'ilike', "%{$q}%");
            })
            ->limit(5)
            ->get();

        return $activities->map(fn (LeadActivity $activity) => [
            'id' => $activity->id,
            'label' => $activity->subject ?? $activity->type,
            'meta' => $activity->type ?? '',
            'url' => "/leads/{$activity->lead_id}",
        ])->values()->all();
    }
}
