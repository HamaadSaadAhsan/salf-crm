<?php

namespace App\Providers;

use App\Models\Lead;
use App\Observers\LeadObserver;
use App\Observers\PermissionObserver;
use App\Observers\RoleObserver;
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
            return $user->hasRole('super-admin');
        });

        Role::observe(RoleObserver::class);
        Permission::observe(PermissionObserver::class);
        Lead::observe(LeadObserver::class);
    }
}
