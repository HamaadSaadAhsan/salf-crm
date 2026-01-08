<?php

use App\Http\Controllers\Api\CallSessionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\LeadActivityController;
use App\Http\Controllers\Api\MetricsController;
use App\Http\Controllers\Api\Roles\PermissionController;
use App\Http\Controllers\Api\Roles\RoleController;
use App\Http\Controllers\FacebookIntegrationController;
use App\Http\Controllers\FacebookOAuthController;
use App\Http\Controllers\FacebookWebhookController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\StatusController;
use App\Http\Controllers\UserController;
use App\Http\Resources\SourceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

// Facebook Webhook - needs to be publicly accessible
Route::get('/facebook/webhook', [FacebookWebhookController::class, 'verify'])->name('facebook.webhook.verify');
Route::post('/facebook/webhook', [FacebookWebhookController::class, 'handle'])->name('facebook.webhook');

// Asterisk Call Webhooks - needs to be publicly accessible or restricted by IP
Route::post('/asterisk/inbound-call', [\App\Http\Controllers\AsteriskCallController::class, 'handleInboundCall'])->name('asterisk.inbound-call');
Route::post('/asterisk/call-recording', [CallSessionController::class, 'updateRecording'])->name('asterisk.call-recording');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::resource('leads', LeadController::class)->names('leads');
    Route::get('leads/stats', [LeadController::class, 'stats'])->name('leads.stats');
    Route::post('leads/export', [LeadController::class, 'export'])->name('leads.export');

    Route::apiResource('services', ServiceController::class)->names('services');
    Route::apiResource('statuses', StatusController::class)->names('statuses');
    Route::apiResource('sources', SourceController::class)->names('sources');

    // Users Management Page
    Route::get('/users', [UserController::class, 'page'])->name('users.page');

    // User Impersonation (Super Admin only)
    // Note: /leave route must come BEFORE /{user} to avoid "leave" being treated as user ID
    Route::post('/impersonate/leave', [ImpersonationController::class, 'leave'])->name('impersonate.leave');
    Route::post('/impersonate/{user}', [ImpersonationController::class, 'impersonate'])->name('impersonate');

    // Users API Resource
    Route::prefix('api')->group(function () {
        Route::apiResource('users', UserController::class)->except(['create', 'edit'])->names('users');
        Route::patch('users/{user}/office', [UserController::class, 'updateOffice'])->name('users.update-office');
        Route::patch('users/{user}/zone', [UserController::class, 'updateZone'])->name('users.update-zone');
        Route::patch('users/{user}/services', [UserController::class, 'updateServices'])->name('users.update-services');

        // Location Hierarchy API
        Route::apiResource('countries', \App\Http\Controllers\CountryController::class)->names('countries');
        Route::apiResource('provinces', \App\Http\Controllers\ProvinceController::class)->names('provinces');
        Route::apiResource('cities', \App\Http\Controllers\CityController::class)->names('cities');
    });

    // Zones Management
    Route::get('/zones', [\App\Http\Controllers\ZoneController::class, 'index'])->name('zones.index');
    Route::post('/zones', [\App\Http\Controllers\ZoneController::class, 'store'])->name('zones.store');
    Route::patch('/zones/{zone}', [\App\Http\Controllers\ZoneController::class, 'update'])->name('zones.update');
    Route::delete('/zones/{zone}', [\App\Http\Controllers\ZoneController::class, 'destroy'])->name('zones.destroy');

    // Offices Management
    Route::get('/offices', [\App\Http\Controllers\OfficeController::class, 'index'])->name('offices.index');
    Route::post('/offices', [\App\Http\Controllers\OfficeController::class, 'store'])->name('offices.store');
    Route::patch('/offices/{office}', [\App\Http\Controllers\OfficeController::class, 'update'])->name('offices.update');
    Route::delete('/offices/{office}', [\App\Http\Controllers\OfficeController::class, 'destroy'])->name('offices.destroy');

    // Countries Management
    Route::get('/countries', [\App\Http\Controllers\CountryController::class, 'index'])->name('countries.index');
    Route::post('/countries', [\App\Http\Controllers\CountryController::class, 'store'])->name('countries.store');
    Route::put('/countries/{country}', [\App\Http\Controllers\CountryController::class, 'update'])->name('countries.update');
    Route::delete('/countries/{country}', [\App\Http\Controllers\CountryController::class, 'destroy'])->name('countries.destroy');

    // Provinces Management
    Route::get('/provinces', [\App\Http\Controllers\ProvinceController::class, 'index'])->name('provinces.index');
    Route::post('/provinces', [\App\Http\Controllers\ProvinceController::class, 'store'])->name('provinces.store');
    Route::put('/provinces/{province}', [\App\Http\Controllers\ProvinceController::class, 'update'])->name('provinces.update');
    Route::delete('/provinces/{province}', [\App\Http\Controllers\ProvinceController::class, 'destroy'])->name('provinces.destroy');

    // Cities Management
    Route::get('/cities', [\App\Http\Controllers\CityController::class, 'index'])->name('cities.index');
    Route::post('/cities', [\App\Http\Controllers\CityController::class, 'store'])->name('cities.store');
    Route::put('/cities/{city}', [\App\Http\Controllers\CityController::class, 'update'])->name('cities.update');
    Route::delete('/cities/{city}', [\App\Http\Controllers\CityController::class, 'destroy'])->name('cities.destroy');

    // Lead Activities
    Route::apiResource('lead-activities', LeadActivityController::class)->names('lead-activities');

    // Call Sessions
    Route::prefix('api')->group(function () {
        Route::get('/leads/{lead}/calls', [CallSessionController::class, 'leadCallHistory'])->name('api.leads.calls');
        Route::get('/leads/{lead}/recordings', [CallSessionController::class, 'leadRecordings'])->name('api.leads.recordings');
        Route::get('/calls/{callSession}', [CallSessionController::class, 'show'])->name('api.calls.show');
        Route::get('/calls/{callSession}/recording', [CallSessionController::class, 'streamRecording'])->name('api.calls.recording');
        Route::post('/calls/state', [CallSessionController::class, 'storeCallState'])->name('api.calls.state');
        Route::post('/calls/initiate', [CallSessionController::class, 'initiateCall'])->name('api.calls.initiate');
        Route::patch('/calls/{sessionId}/status', [CallSessionController::class, 'updateStatus'])->name('api.calls.update-status');
        Route::get('/calls/signature/{signature}', [CallSessionController::class, 'getBySignature'])->name('api.calls.by-signature');
    });

    // Dashboard & Metrics
    Route::prefix('api/dashboard')->group(function () {
        Route::get('/overview', [DashboardController::class, 'overview'])->name('dashboard.overview');
        Route::get('/leads-overview', [DashboardController::class, 'leadsOverview'])->name('dashboard.leads-overview');
        Route::get('/lead-analytics', [DashboardController::class, 'leadAnalytics'])->name('dashboard.lead-analytics');
        Route::get('/revenue-pipeline', [DashboardController::class, 'revenuePipeline'])->name('dashboard.revenue-pipeline');
        Route::get('/lifecycle-funnel', [DashboardController::class, 'leadLifecycleFunnel'])->name('dashboard.lifecycle-funnel');
        Route::get('/lead-distribution', [DashboardController::class, 'leadDistribution'])->name('dashboard.lead-distribution');
        Route::get('/activity-heatmap', [DashboardController::class, 'activityHeatmap'])->name('dashboard.activity-heatmap');
        Route::get('/conversion-by-service', [DashboardController::class, 'conversionByService'])->name('dashboard.conversion-by-service');
        Route::get('/activity-timeline', [DashboardController::class, 'activityTimeline'])->name('dashboard.activity-timeline');
        Route::get('/lead-source-performance', [DashboardController::class, 'leadSourcePerformance'])->name('dashboard.lead-source-performance');
        Route::get('/program-performance', [DashboardController::class, 'programPerformance'])->name('dashboard.program-performance');
        Route::get('/task-completion-analysis', [DashboardController::class, 'taskCompletionAnalysis'])->name('dashboard.task-completion-analysis');
        Route::get('/lead-lifecycle-analysis', [DashboardController::class, 'leadLifecycleAnalysis'])->name('dashboard.lead-lifecycle-analysis');
    });

    Route::prefix('api/metrics')->group(function () {
        Route::get('/conversion', [MetricsController::class, 'conversion'])->name('metrics.conversion');
        Route::get('/business-performance', [MetricsController::class, 'businessPerformance'])->name('metrics.business-performance');
        Route::get('/department-handoff', [MetricsController::class, 'departmentHandoff'])->name('metrics.department-handoff');
        Route::get('/system-adoption', [MetricsController::class, 'systemAdoption'])->name('metrics.system-adoption');
        Route::get('/user-performance', [MetricsController::class, 'userPerformance'])->name('metrics.user-performance');
        Route::get('/daily', [MetricsController::class, 'dailyMetrics'])->name('metrics.daily');
    });

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

    // Admin Facebook Token Management (Super Admin Only)
    Route::prefix('admin/facebook-tokens')->middleware('role:super-admin')->group(function () {
        Route::get('/overview', [\App\Http\Controllers\Admin\FacebookTokenController::class, 'tokenOverview'])->name('admin.facebook.tokens.overview');
        Route::get('/expired', [\App\Http\Controllers\Admin\FacebookTokenController::class, 'expiredTokens'])->name('admin.facebook.tokens.expired');
        Route::get('/expiring-soon', [\App\Http\Controllers\Admin\FacebookTokenController::class, 'tokensExpiringSoon'])->name('admin.facebook.tokens.expiring');
        Route::get('/user/{userId}/details', [\App\Http\Controllers\Admin\FacebookTokenController::class, 'userTokenDetails'])->name('admin.facebook.tokens.user.details');
        Route::post('/user/{userId}/revoke', [\App\Http\Controllers\Admin\FacebookTokenController::class, 'revokeUserToken'])->name('admin.facebook.tokens.user.revoke');
        Route::post('/user/{userId}/notify', [\App\Http\Controllers\Admin\FacebookTokenController::class, 'notifyUserTokenExpiry'])->name('admin.facebook.tokens.user.notify');
    });

    Route::get('/facebook/callback', [FacebookOAuthController::class, 'callback']);

    Route::prefix('integrations')->group(function () {
        Route::get('/', [\App\Http\Controllers\IntegrationController::class, 'index'])->name('integrations');
        Route::prefix('/facebook')->group(function () {
            // Template management
            Route::get('/templates', [FacebookIntegrationController::class, 'getTemplates'])->name('facebook.integration.templates');
            Route::post('/apply-template', [FacebookIntegrationController::class, 'applyTemplate'])->name('facebook.integration.apply-template');

            Route::get('/', [FacebookIntegrationController::class, 'index'])->name('facebook.integration.index');
            Route::post('/', [FacebookIntegrationController::class, 'store'])->name('facebook.integration.store');
            Route::get('/health', [FacebookIntegrationController::class, 'getHealthStatus'])->name('facebook.integration.health');
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
            Route::post('oauth/authorize', [FacebookOAuthController::class, 'initiateOAuth'])->name('facebook.oauth.authorize');
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
            Route::post('/authorize', [GoogleCalendarController::class, 'initiateOAuth']);
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

    // SIP/Call Management Routes
    Route::resource('sip-accounts', \App\Http\Controllers\SipAccountController::class)->names('sip-accounts');
    Route::post('sip-accounts/{sip_account}/register', [\App\Http\Controllers\SipAccountController::class, 'register'])->name('sip-accounts.register');
    Route::post('sip-accounts/{sip_account}/toggle', [\App\Http\Controllers\SipAccountController::class, 'toggle'])->name('sip-accounts.toggle');

    Route::resource('calls', \App\Http\Controllers\CallController::class)->except(['edit', 'update', 'destroy'])->names('calls');
    //    Route::get('calls/history', [\App\Http\Controllers\CallController::class, 'history'])->name('calls.history');

    Route::resource('workflows', \App\Http\Controllers\WorkflowController::class)->names('workflows');
    Route::post('workflows/{workflow}/duplicate', [\App\Http\Controllers\WorkflowController::class, 'duplicate'])->name('workflows.duplicate');
    Route::get('workflows/schema/leads', [\App\Http\Controllers\WorkflowController::class, 'getLeadSchema'])->name('workflows.schema.leads');
    Route::post('workflows/{workflow}/test', [\App\Http\Controllers\WorkflowController::class, 'testWorkflow'])->name('workflows.test');

    // Task management
    Route::resource('tasks', \App\Http\Controllers\TaskController::class)->names('tasks');
    Route::post('tasks/{task}/complete', [\App\Http\Controllers\TaskController::class, 'complete'])->name('tasks.complete');

    // Task API endpoints
    Route::prefix('api/tasks')->group(function () {
        Route::get('pending-reminders', [\App\Http\Controllers\Api\TaskController::class, 'pendingReminders'])->name('api.tasks.pending-reminders');
        Route::post('{task}/complete', [\App\Http\Controllers\Api\TaskController::class, 'complete'])->name('api.tasks.complete');
        Route::post('{task}/incomplete', [\App\Http\Controllers\Api\TaskController::class, 'incomplete'])->name('api.tasks.incomplete');
    });

    // Account Management Routes
    Route::prefix('account')->name('account.')->group(function () {
        Route::get('/', [\App\Http\Controllers\AccountController::class, 'index'])->name('index');
        Route::get('/show', [\App\Http\Controllers\AccountController::class, 'show'])->name('show');
        Route::post('/profile', [\App\Http\Controllers\AccountController::class, 'updateProfile'])->name('profile.update');
        Route::post('/password', [\App\Http\Controllers\AccountController::class, 'updatePassword'])->name('password.update');
        Route::delete('/', [\App\Http\Controllers\AccountController::class, 'destroy'])->name('destroy');
    });

    // Call API endpoints - Real-time call control
    Route::prefix('api/calls')->group(function () {
        // Note: 'initiate' route is defined in CallSessionController (line 62) - removed duplicate here
        Route::post('{id}/answer', [\App\Http\Controllers\Api\CallController::class, 'answer'])->name('api.calls.answer');
        Route::post('{id}/hangup', [\App\Http\Controllers\Api\CallController::class, 'hangup'])->name('api.calls.hangup');
        Route::post('{id}/mute', [\App\Http\Controllers\Api\CallController::class, 'mute'])->name('api.calls.mute');
        Route::post('{id}/unmute', [\App\Http\Controllers\Api\CallController::class, 'unmute'])->name('api.calls.unmute');
        Route::post('{id}/hold', [\App\Http\Controllers\Api\CallController::class, 'hold'])->name('api.calls.hold');
        Route::post('{id}/resume', [\App\Http\Controllers\Api\CallController::class, 'resume'])->name('api.calls.resume');
        Route::post('{id}/transfer', [\App\Http\Controllers\Api\CallController::class, 'transfer'])->name('api.calls.transfer');
        Route::get('recent', [\App\Http\Controllers\Api\CallController::class, 'getRecent'])->name('api.calls.recent');
        Route::get('active', [\App\Http\Controllers\Api\CallController::class, 'getActive'])->name('api.calls.active');
        Route::get('{id}', [\App\Http\Controllers\Api\CallController::class, 'show'])->name('api.calls.show');
    });

    // Legacy call control endpoints (AJAX) - kept for backward compatibility
    Route::post('calls/{call_session}/answer', [\App\Http\Controllers\CallController::class, 'answer'])->name('calls.answer');
    Route::post('calls/{call_session}/hangup', [\App\Http\Controllers\CallController::class, 'hangup'])->name('calls.hangup');
    Route::post('calls/{call_session}/hold', [\App\Http\Controllers\CallController::class, 'hold'])->name('calls.hold');
    Route::post('calls/{call_session}/unhold', [\App\Http\Controllers\CallController::class, 'unhold'])->name('calls.unhold');
    Route::post('calls/{call_session}/mute', [\App\Http\Controllers\CallController::class, 'mute'])->name('calls.mute');
    Route::post('calls/{call_session}/unmute', [\App\Http\Controllers\CallController::class, 'unmute'])->name('calls.unmute');
    Route::post('calls/{call_session}/start-recording', [\App\Http\Controllers\CallController::class, 'startRecording'])->name('calls.start-recording');
    Route::post('calls/{call_session}/stop-recording', [\App\Http\Controllers\CallController::class, 'stopRecording'])->name('calls.stop-recording');

    // Asterisk Inbound Call Management
    Route::prefix('api/asterisk')->group(function () {
        Route::post('/call-lead', [\App\Http\Controllers\AsteriskCallController::class, 'storeCallLead'])->name('api.asterisk.call-lead');
        Route::post('/call-notes', [\App\Http\Controllers\AsteriskCallController::class, 'saveCallNotes'])->name('api.asterisk.call-notes');
        Route::patch('/call-sessions/{sessionId}/link-lead', [\App\Http\Controllers\AsteriskCallController::class, 'linkLeadToSession'])->name('api.asterisk.link-lead');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
