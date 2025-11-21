<?php

namespace App\Policies;

use App\Models\User;

class DashboardPolicy
{
    public function viewDashboard(User $user): bool
    {
        // All authenticated users can view some form of dashboard
        return true;
    }

    public function viewAllMetrics(User $user): bool
    {
        // Only super-admin and admin can view all metrics
        return $user->hasAnyRole(['super-admin', 'admin']);
    }

    public function viewTeamMetrics(User $user): bool
    {
        // Managers and team-leads can view team metrics
        return $user->hasAnyRole(['super-admin', 'admin', 'manager', 'team-lead']);
    }

    public function viewPersonalMetrics(User $user): bool
    {
        // Everyone can view their own metrics
        return true;
    }

    public function viewSystemMetrics(User $user): bool
    {
        // Only super-admin, admin, and manager can view system adoption metrics
        return $user->hasAnyRole(['super-admin', 'admin', 'manager']);
    }

    public function viewConversionMetrics(User $user): bool
    {
        // All users except customers can view conversion metrics
        return ! $user->hasRole('customer');
    }

    public function viewDepartmentMetrics(User $user): bool
    {
        // Managers and above can view department handoff metrics
        return $user->hasAnyRole(['super-admin', 'admin', 'manager', 'team-lead']);
    }
}
