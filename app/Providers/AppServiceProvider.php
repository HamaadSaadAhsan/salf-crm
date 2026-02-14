<?php

namespace App\Providers;

use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Observers\CallSessionObserver;
use App\Observers\LeadActivityObserver;
use App\Observers\LeadObserver;
use App\Observers\PermissionObserver;
use App\Observers\RoleObserver;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Ai\AiManager;
use Laravel\Ai\Contracts\Providers\TextProvider;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(TextProvider::class, fn ($app) => $app->make(AiManager::class)->textProvider());
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
        LeadActivity::observe(LeadActivityObserver::class);
        CallSession::observe(CallSessionObserver::class);

        // Event listeners are auto-discovered by Laravel from app/Listeners
    }
}
