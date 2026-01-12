<?php

namespace App\Providers;

use App\Events\LeadAssigned;
use App\Listeners\SendLeadAssignedNotification;
use App\Models\Lead;
use App\Observers\LeadObserver;
use App\Observers\PermissionObserver;
use App\Observers\RoleObserver;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(function ($user, $ability) {
            return $user->hasRole('super-admin') ? true : null;
        });

        Role::observe(RoleObserver::class);
        Permission::observe(PermissionObserver::class);
        Lead::observe(LeadObserver::class);

        // Register event listeners for lead notifications
        Event::listen(LeadAssigned::class, SendLeadAssignedNotification::class);
    }
}
