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
use App\Services\Forms\FormsServiceClient;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Laravel\Ai\AiManager;
use Laravel\Ai\Contracts\Providers\TextProvider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
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

        $this->app->singleton(FormsServiceClient::class, function ($app) {
            return new FormsServiceClient(
                baseUrl: config('services.forms_service.url'),
                token: config('services.forms_service.token'),
                timeout: config('services.forms_service.timeout'),
                logger: $app->make('log')->channel('forms'),
            );
        });
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

        // Register custom Socialite driver for Google Drive (separate OAuth from Calendar)
        Socialite::extend('google_drive', function ($app) {
            $config = $app['config']['services.google_drive'];

            return Socialite::buildProvider(
                GoogleProvider::class,
                $config,
            );
        });

        // Event listeners are auto-discovered by Laravel from app/Listeners
    }
}
