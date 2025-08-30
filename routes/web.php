<?php

use App\Http\Controllers\Api\Roles\PermissionController;
use App\Http\Controllers\Api\Roles\RoleController;
use App\Http\Controllers\Api\LeadActivityController;
use App\Http\Controllers\FacebookIntegrationController;
use App\Http\Controllers\FacebookOAuthController;
use App\Http\Controllers\FacebookWebhookController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\StatusController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// Facebook Webhook - needs to be publicly accessible
Route::get('/facebook/webhook', [FacebookWebhookController::class, 'verify'])->name('facebook.webhook.verify');
Route::post('/facebook/webhook', [FacebookWebhookController::class, 'handle'])->name('facebook.webhook');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::resource('leads', LeadController::class)->names('leads');
    Route::get('leads/stats', [LeadController::class, 'stats'])->name('leads.stats');
    Route::post('leads/export', [LeadController::class, 'export'])->name('leads.export');

    Route::apiResource('services', ServiceController::class)->names('services');
    Route::apiResource('statuses', StatusController::class)->names('statuses');

    Route::apiResource('users', UserController::class)->names('users');

    // Lead Activities
    Route::apiResource('lead-activities', LeadActivityController::class)->names('lead-activities');

    // Roles
    Route::prefix('roles')->group(function () {
        Route::get('/', [RoleController::class, 'index']);
        Route::post('/', [RoleController::class, 'store']);
        Route::get('/{role}', [RoleController::class, 'show']);
        Route::put('/{role}', [RoleController::class, 'update']);
        Route::delete('/{role}', [RoleController::class, 'destroy']);
        Route::post('/{role}/assign-permissions', [RoleController::class, 'assignPermissions']);
    });


    // Permissions
    Route::prefix('permissions')->group(function () {
        Route::get('/', [PermissionController::class, 'index']);
        Route::get('/matrix', [PermissionController::class, 'matrix']);
        Route::post('/bulk-update', [PermissionController::class, 'bulkUpdate']);
    });

    Route::get('integrations', [\App\Http\Controllers\IntegrationController::class, 'index'])->name('integrations');
    Route::get('/facebook/callback', [FacebookOAuthController::class, 'callback']);

    Route::prefix('integrations')->group(function () {
        Route::get('/', [\App\Http\Controllers\IntegrationController::class, 'index']);
        Route::prefix('/facebook')->group(function () {
            // Template management
            Route::get('/templates', [FacebookIntegrationController::class, 'getTemplates'])->name('facebook.integration.templates');
            Route::post('/apply-template', [FacebookIntegrationController::class, 'applyTemplate'])->name('facebook.integration.apply-template');
            
            Route::get('/', [FacebookIntegrationController::class, 'index'])->name('facebook.integration.index');
            Route::post('/', [FacebookIntegrationController::class, 'store'])->name('facebook.integration.store');
            Route::post('/test-connection', [FacebookIntegrationController::class, 'testConnection'])->name('facebook.integration.test');
            Route::get('/insights', [FacebookIntegrationController::class, 'getPageInsights'])->name('facebook.integration.insights');
            Route::get('/posts', [FacebookIntegrationController::class, 'getPagePosts'])->name('facebook.integration.posts');
            Route::post('/posts', [FacebookIntegrationController::class, 'createPost'])->name('facebook.integration.posts.create');
            Route::get('/webhook-config', [FacebookIntegrationController::class, 'getWebhookConfig'])->name('facebook.integration.webhook.config');
            Route::post('/webhooks', [FacebookIntegrationController::class, 'subscribeWebhook'])->name('facebook.integration.webhook.subscribe');
            Route::get('/page-info', [FacebookIntegrationController::class, 'getPageInfo'])->name('facebook.integration.page.info');
            Route::post('/sync', [FacebookIntegrationController::class, 'syncPageData'])->name('facebook.integration.sync');
            Route::post('/deactivate', [FacebookIntegrationController::class, 'deactivate'])->name('facebook.integration.deactivate');
            Route::delete('/', [FacebookIntegrationController::class, 'destroy'])->name('facebook.integration.destroy');
            Route::post('oauth/authorize', [FacebookOAuthController::class, 'authorize'])->name('facebook.oauth.authorize');
            Route::post('/pages', [FacebookIntegrationController::class, 'getPages'])->name('facebook.integration.pages');
            Route::post('/forms', [FacebookIntegrationController::class, 'getForms'])->name('facebook.integration.forms');
            Route::post('/form/leads', [FacebookIntegrationController::class, 'getPageLeads'])->name('facebook.integration.leads');
            Route::post('/sync-lead-forms', [FacebookIntegrationController::class, 'syncLeadForms'])->name('facebook.integration.sync-lead-forms');
            Route::post('/sync-leads', [FacebookIntegrationController::class, 'syncLeads'])->name('facebook.integration.sync-leads');
        });
//        Route::get('/google', [\App\Http\Controllers\IntegrationController::class, 'google']);
//        Route::get('/linkedin', [\App\Http\Controllers\IntegrationController::class, 'linkedin']);
    });

    Route::middleware('calendar.errors')->group(function () {
        // Calendar Integration Routes
        Route::prefix('calendar')->group(function () {
            Route::get('/', [GoogleCalendarController::class, 'index']);
//        Route::get('/{id}', [GoogleCalendarController::class, 'show']);
            Route::post('/authorize', [GoogleCalendarController::class, 'authorize']);
            Route::get('/callback', [GoogleCalendarController::class, 'callback']);
//        Route::put('/{id}', [GoogleCalendarController::class, 'update']);
//        Route::delete('/{id}', [GoogleCalendarController::class, 'disconnect']);
//        Route::post('/{id}/refresh-token', [GoogleCalendarController::class, 'refreshToken']);
//        Route::get('/{id}/calendars', [GoogleCalendarController::class, 'getCalendars']);
//        Route::post('/{id}/events', [GoogleCalendarController::class, 'createEvent']);
//        Route::get('/{id}/status', [GoogleCalendarController::class, 'status']);
            Route::get('/status', [GoogleCalendarController::class, 'isAnyCalendarConnected']);
        });
    });
});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
