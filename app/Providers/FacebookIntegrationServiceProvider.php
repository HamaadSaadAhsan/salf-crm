<?php

namespace App\Providers;

use App\Events\FacebookConnected;
use App\Events\FacebookDisconnected;
use App\Events\FacebookWebhookReceived;
use App\Events\FacebookDataSynced;
use App\Events\FacebookErrorOccurred;
use App\Events\FacebookHealthStatusChanged;
use App\Events\FacebookLeadProcessed;
use App\Listeners\FacebookIntegrationEventListener;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class FacebookIntegrationServiceProvider extends ServiceProvider
{
    /**
     * The event listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        FacebookConnected::class => [
            [FacebookIntegrationEventListener::class, 'handleFacebookConnected'],
        ],
        FacebookDisconnected::class => [
            [FacebookIntegrationEventListener::class, 'handleFacebookDisconnected'],
        ],
        FacebookWebhookReceived::class => [
            [FacebookIntegrationEventListener::class, 'handleWebhookReceived'],
        ],
        FacebookDataSynced::class => [
            [FacebookIntegrationEventListener::class, 'handleDataSynced'],
        ],
        FacebookErrorOccurred::class => [
            [FacebookIntegrationEventListener::class, 'handleErrorOccurred'],
        ],
        FacebookHealthStatusChanged::class => [
            [FacebookIntegrationEventListener::class, 'handleHealthStatusChanged'],
        ],
        FacebookLeadProcessed::class => [
            [FacebookIntegrationEventListener::class, 'handleLeadProcessed'],
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        parent::boot();
    }
}