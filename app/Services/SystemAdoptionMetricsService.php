<?php

namespace App\Services;

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\SystemAdoptionMetric;
use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SystemAdoptionMetricsService
{
    public function calculate(Carbon $date): SystemAdoptionMetric
    {
        $totalUsers = User::count();
        $activeUsers = User::where('last_activity_at', '>=', $date->copy()->subDays(30))->count();
        $veryActiveUsers = User::where('last_activity_at', '>=', $date->copy()->subDays(7))->count();
        $inactiveUsers = $totalUsers - $activeUsers;

        $adoptionRate = $totalUsers > 0 ? ($activeUsers / $totalUsers) * 100 : 0;
        $engagementRate = $totalUsers > 0 ? ($veryActiveUsers / $totalUsers) * 100 : 0;

        // Get user counts by role
        $usersByRole = User::join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->select('roles.name as role', DB::raw('count(*) as count'))
            ->groupBy('roles.name')
            ->pluck('count', 'role')
            ->toArray();

        // Get active users by role
        $activeUsersByRole = User::join('model_has_roles', 'users.id', '=', 'model_has_roles.model_id')
            ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
            ->where('users.last_activity_at', '>=', $date->copy()->subDays(30))
            ->select('roles.name as role', DB::raw('count(*) as count'))
            ->groupBy('roles.name')
            ->pluck('count', 'role')
            ->toArray();

        // Calculate totals for the date
        $totalLogins = User::whereDate('last_activity_at', $date)->count();
        $totalActivitiesCreated = LeadActivity::whereDate('created_at', $date)->count();
        $totalLeadsCreated = Lead::whereDate('created_at', $date)->count();
        $totalTasksCreated = Task::whereDate('created_at', $date)->count();

        $avgActivitiesPerUser = $activeUsers > 0 ? $totalActivitiesCreated / $activeUsers : 0;
        $avgLoginsPerUser = $activeUsers > 0 ? $totalLogins / $activeUsers : 0;

        return SystemAdoptionMetric::updateOrCreate(
            ['metric_date' => $date->toDateString()],
            [
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'very_active_users' => $veryActiveUsers,
                'inactive_users' => $inactiveUsers,
                'adoption_rate' => round($adoptionRate, 2),
                'engagement_rate' => round($engagementRate, 2),
                'users_by_role' => $usersByRole,
                'active_users_by_role' => $activeUsersByRole,
                'total_logins' => $totalLogins,
                'total_activities_created' => $totalActivitiesCreated,
                'total_leads_created' => $totalLeadsCreated,
                'total_tasks_created' => $totalTasksCreated,
                'avg_activities_per_user' => round($avgActivitiesPerUser, 2),
                'avg_logins_per_user' => round($avgLoginsPerUser, 2),
            ]
        );
    }
}
