<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\Admin\FacebookTokenController;
use App\Http\Controllers\Api\AiChatController;
use App\Http\Controllers\Api\CallSessionController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\Forms\ApplicationApiController;
use App\Http\Controllers\Api\Forms\FormTemplateApiController;
use App\Http\Controllers\Api\Forms\GenerationApiController;
use App\Http\Controllers\Api\Forms\LeadApplicationController;
use App\Http\Controllers\Api\Forms\ProgramSchemaController;
use App\Http\Controllers\Api\Forms\TemplatePageController;
use App\Http\Controllers\Api\GlobalSearchController;
use App\Http\Controllers\Api\LeadActivityController;
use App\Http\Controllers\Api\LeadFileController;
use App\Http\Controllers\Api\LeadFolderController;
use App\Http\Controllers\Api\LeadGoogleDriveFileController;
use App\Http\Controllers\Api\LeadPdfSubmissionController;
use App\Http\Controllers\Api\MentionUserController;
use App\Http\Controllers\Api\MetricsController;
use App\Http\Controllers\Api\PdfTemplateController;
use App\Http\Controllers\Api\PhoneRevealController;
use App\Http\Controllers\Api\Roles\PermissionController;
use App\Http\Controllers\Api\Roles\RoleController;
use App\Http\Controllers\Api\SavedFilterController;
use App\Http\Controllers\Api\UserPerformanceController;
use App\Http\Controllers\AssignmentVisualizerController;
use App\Http\Controllers\AsteriskCallController;
use App\Http\Controllers\CallController;
use App\Http\Controllers\CityController;
use App\Http\Controllers\CountryController;
use App\Http\Controllers\DynamicWebhookController;
use App\Http\Controllers\FacebookIntegrationController;
use App\Http\Controllers\FacebookOAuthController;
use App\Http\Controllers\FacebookWebhookController;
use App\Http\Controllers\FollowUpCalendarController;
use App\Http\Controllers\GmailController;
use App\Http\Controllers\GoogleCalendarController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\Leads\LeadBulkActionController;
use App\Http\Controllers\Leads\LeadController;
use App\Http\Controllers\MailController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OfficeController;
use App\Http\Controllers\ProvinceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\Settings\GoogleDriveController;
use App\Http\Controllers\Settings\StorageAccountController;
use App\Http\Controllers\StatusController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\TicketCommentController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WorkflowController;
use App\Http\Controllers\ZoneController;
use App\Http\Resources\SourceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Health check endpoint for deployment verification
Route::get('/health', HealthController::class)->name('health');

Route::get('/', function () {
    return redirect(route('dashboard'));
})->name('home');

// Facebook Webhook - needs to be publicly accessible
Route::get('/facebook/webhook', [FacebookWebhookController::class, 'verify'])->name('facebook.webhook.verify');
Route::post('/facebook/webhook', [FacebookWebhookController::class, 'handle'])->name('facebook.webhook');

// Dynamic Workflow Webhooks - auto-generated per workflow, no manual config needed
Route::get('/webhooks/workflow/{token}', [DynamicWebhookController::class, 'verify'])->name('webhooks.workflow.verify');
Route::post('/webhooks/workflow/{token}', [DynamicWebhookController::class, 'handle'])->name('webhooks.workflow.handle');

// Asterisk Call Webhooks - needs to be publicly accessible or restricted by IP
Route::post('/asterisk/inbound-call', [AsteriskCallController::class, 'handleInboundCall'])->name('asterisk.inbound-call');
Route::post('/asterisk/outbound-call', [AsteriskCallController::class, 'handleOutboundCall'])->name('asterisk.outbound-call');
Route::post('/asterisk/call-recording', [CallSessionController::class, 'updateRecording'])->name('asterisk.call-recording');
Route::post('/asterisk/ring-group-member', [AsteriskCallController::class, 'handleRingGroupMember'])->name('asterisk.ring-group-member');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->middleware('role_or_permission:super-admin|view dashboard')->name('dashboard');

    Route::middleware('role_or_permission:super-admin|view leads')->group(function () {
        Route::resource('leads', LeadController::class)->except('show')->names('leads');
        Route::get('leads/stats', [LeadController::class, 'stats'])->name('leads.stats');
        Route::post('leads/export', [LeadController::class, 'export'])->name('leads.export');
        Route::put('leads/{lead}/advisor-stage', [LeadController::class, 'updateAdvisorStage'])->name('leads.update-advisor-stage');
        Route::post('leads/bulk/assign', [LeadBulkActionController::class, 'assign'])->name('leads.bulk.assign');
        Route::post('leads/bulk/status', [LeadBulkActionController::class, 'status'])->name('leads.bulk.status');
        Route::post('leads/bulk/delete', [LeadBulkActionController::class, 'destroy'])->name('leads.bulk.destroy');
        Route::get('leads/{lead}/{tab?}', [LeadController::class, 'show'])->name('leads.show')
            ->where('tab', 'overview|activity|notes|tasks|calls|files|documents');
    });

    Route::apiResource('statuses', StatusController::class)->names('statuses');
    Route::post('statuses/reorder', [StatusController::class, 'reorder'])->name('statuses.reorder');
    Route::apiResource('sources', SourceController::class)->names('sources');

    // User Impersonation (Super Admin only)
    // Note: /leave route must come BEFORE /{user} to avoid "leave" being treated as user ID
    Route::post('/impersonate/leave', [ImpersonationController::class, 'leave'])->name('impersonate.leave');
    Route::post('/impersonate/{user}', [ImpersonationController::class, 'impersonate'])->name('impersonate');

    // Services - viewable by all authenticated users
    Route::get('/services', [ServiceController::class, 'index'])->name('services.index');
    Route::get('/services/{service}', [ServiceController::class, 'show'])->name('services.show');

    // Assignment Visualizer (Super Admin only)
    Route::get('/settings/management/assignment-visualizer', [AssignmentVisualizerController::class, 'page'])
        ->middleware('role:super-admin')
        ->name('assignment-visualizer');
    Route::get('api/assignment-visualizer', [AssignmentVisualizerController::class, 'index'])
        ->middleware('role:super-admin')
        ->name('api.assignment-visualizer');

    // Forms Automation API (Lead-scoped — available to all authenticated users)
    Route::prefix('api/leads/{lead}/forms')->name('api.leads.forms.')->group(function () {
        Route::get('/programs', [LeadApplicationController::class, 'programs'])->name('programs');
        Route::get('/applications', [LeadApplicationController::class, 'index'])->name('applications.index');
        Route::post('/applications', [LeadApplicationController::class, 'store'])->name('applications.store');
        Route::put('/applications/{application}', [LeadApplicationController::class, 'update'])->name('applications.update');
        Route::post('/applications/{application}/generate', [LeadApplicationController::class, 'generate'])->name('applications.generate');
        Route::delete('/applications/{application}', [LeadApplicationController::class, 'destroy'])->name('applications.destroy');
        Route::get('/applications/{application}/generations', [LeadApplicationController::class, 'generations'])->name('applications.generations');
        Route::get('/generations/{generation}/download', [LeadApplicationController::class, 'downloadGeneration'])->name('generations.download');
    });

    // Forms program schema — accessible to all authenticated users (no lead context needed)
    Route::get('api/forms/programs/{program}/schema', [ProgramSchemaController::class, 'show'])->name('api.forms.programs.schema');

    // Forms Automation API (Admin)
    Route::middleware('role:super-admin')->prefix('api/forms')->name('api.forms.')->group(function () {
        Route::get('/templates/{formTemplate}/pages/{page}', [TemplatePageController::class, 'show'])->name('templates.page')->where('page', '[0-9]+');
        Route::post('/templates/{formTemplate}/sync', [FormTemplateApiController::class, 'syncInventory'])->name('templates.sync');
        Route::get('/templates/{formTemplate}/mappings', [FormTemplateApiController::class, 'getMappings'])->name('templates.mappings');
        Route::put('/templates/{formTemplate}/mappings', [FormTemplateApiController::class, 'saveMappings'])->name('templates.save-mappings');
        Route::post('/applications', [ApplicationApiController::class, 'store'])->name('applications.store');
        Route::put('/applications/{application}', [ApplicationApiController::class, 'update'])->name('applications.update');
        Route::delete('/applications/{application}', [ApplicationApiController::class, 'destroy'])->name('applications.destroy');
        Route::post('/applications/{application}/generate', [ApplicationApiController::class, 'generate'])->name('applications.generate');
        Route::get('/applications/{application}/generations', [GenerationApiController::class, 'index'])->name('applications.generations');
        Route::get('/generations/{generation}/download', [GenerationApiController::class, 'download'])->name('generations.download');
    });

    // PDF Templates (Admin)
    Route::middleware('role:super-admin')->prefix('api')->group(function () {
        Route::get('/pdf-templates', [PdfTemplateController::class, 'index'])->name('api.pdf-templates.index');
        Route::post('/pdf-templates', [PdfTemplateController::class, 'store'])->name('api.pdf-templates.store');
        Route::get('/pdf-templates/{pdfTemplate}', [PdfTemplateController::class, 'show'])->name('api.pdf-templates.show');
        Route::patch('/pdf-templates/{pdfTemplate}', [PdfTemplateController::class, 'update'])->name('api.pdf-templates.update');
        Route::delete('/pdf-templates/{pdfTemplate}', [PdfTemplateController::class, 'destroy'])->name('api.pdf-templates.destroy');
        Route::post('/pdf-templates/{pdfTemplate}/fields', [PdfTemplateController::class, 'saveFields'])->name('api.pdf-templates.fields');
        Route::post('/pdf-templates/{pdfTemplate}/scan', [PdfTemplateController::class, 'scanFields'])->name('api.pdf-templates.scan');
    });

    // Management Routes (Super Admin only)
    Route::middleware('role:super-admin')->group(function () {
        // Services/Programs Management (create, update, delete)
        Route::post('/services', [ServiceController::class, 'store'])->name('services.store');
        Route::put('/services/{service}', [ServiceController::class, 'update'])->name('services.update');
        Route::patch('/services/{service}', [ServiceController::class, 'update']);
        Route::delete('/services/{service}', [ServiceController::class, 'destroy'])->name('services.destroy');

        // Users API - Super Admin only (CRUD, permissions, office/zone/services)
        Route::prefix('api')->group(function () {
            Route::apiResource('users', UserController::class)->only(['store', 'show', 'update', 'destroy'])->names('api.users');
            Route::patch('users/{user}/office', [UserController::class, 'updateOffice'])->name('users.update-office');
            Route::patch('users/{user}/zone', [UserController::class, 'updateZone'])->name('users.update-zone');
            Route::patch('users/{user}/services', [UserController::class, 'updateServices'])->name('users.update-services');
            Route::patch('users/{user}/permissions', [UserController::class, 'updatePermissions'])->name('users.update-permissions');
        });

        // Zones Management
        Route::get('/zones', [ZoneController::class, 'index'])->name('zones.index');
        Route::post('/zones', [ZoneController::class, 'store'])->name('zones.store');
        Route::patch('/zones/{zone}', [ZoneController::class, 'update'])->name('zones.update');
        Route::delete('/zones/{zone}', [ZoneController::class, 'destroy'])->name('zones.destroy');

        // Offices Management
        Route::get('/offices', [OfficeController::class, 'index'])->name('offices.index');
        Route::post('/offices', [OfficeController::class, 'store'])->name('offices.store');
        Route::patch('/offices/{office}', [OfficeController::class, 'update'])->name('offices.update');
        Route::delete('/offices/{office}', [OfficeController::class, 'destroy'])->name('offices.destroy');

        // Countries Management
        Route::get('/countries', [CountryController::class, 'index'])->name('countries.index');
        Route::post('/countries', [CountryController::class, 'store'])->name('countries.store');
        Route::put('/countries/{country}', [CountryController::class, 'update'])->name('countries.update');
        Route::delete('/countries/{country}', [CountryController::class, 'destroy'])->name('countries.destroy');

        // Provinces Management
        Route::get('/provinces', [ProvinceController::class, 'index'])->name('provinces.index');
        Route::post('/provinces', [ProvinceController::class, 'store'])->name('provinces.store');
        Route::put('/provinces/{province}', [ProvinceController::class, 'update'])->name('provinces.update');
        Route::delete('/provinces/{province}', [ProvinceController::class, 'destroy'])->name('provinces.destroy');

        // Cities Management
        Route::get('/cities', [CityController::class, 'index'])->name('cities.index');
        Route::post('/cities', [CityController::class, 'store'])->name('cities.store');
        Route::put('/cities/{city}', [CityController::class, 'update'])->name('cities.update');
        Route::delete('/cities/{city}', [CityController::class, 'destroy'])->name('cities.destroy');
    });

    // Users - accessible by super-admin or senior agents with manage team agents permission
    Route::middleware('role_or_permission:super-admin|manage team agents')->group(function () {
        Route::get('/users', [UserController::class, 'page'])->name('users.page');
        Route::get('/users/{user}', [UserController::class, 'showPage'])->name('users.detail');
        Route::prefix('api')->group(function () {
            Route::get('users', [UserController::class, 'index'])->name('api.users.index');
            Route::patch('users/{user}/availability', [UserController::class, 'updateAvailability'])->name('users.update-availability');
            Route::get('users/{user}/activity-heatmap', [UserController::class, 'activityHeatmap'])->name('users.activity-heatmap');
        });
    });

    Route::middleware('role:super-admin|support-agent|senior-support-agent|sales-rep')->group(function () {
        Route::prefix('api')->group(function () {
            // Location Hierarchy API
            Route::apiResource('countries', CountryController::class)->names('api.countries');
            Route::apiResource('provinces', ProvinceController::class)->names('api.provinces');
            Route::apiResource('cities', CityController::class)->names('api.cities');
        });
    });

    // Mention Users (lightweight search for @mentions)
    Route::get('api/mention-users', MentionUserController::class)->name('api.mention-users');

    // Global Search (command palette)
    Route::get('api/global-search', GlobalSearchController::class)->name('api.global-search');

    // Support Tickets - All authenticated users
    Route::resource('support', TicketController::class)->names('support')->parameters(['support' => 'ticket'])->whereNumber('ticket')->except(['edit']);
    Route::post('support/{ticket}/comments', [TicketCommentController::class, 'store'])->name('support.comments.store');

    // Admin Ticket Management
    Route::get('admin/tickets', [TicketController::class, 'adminIndex'])
        ->middleware('role:super-admin')->name('admin.tickets.index');

    // Tasks Management
    Route::resource('tasks', TaskController::class)->names('tasks');

    // Follow-Up Calendar
    Route::get('follow-up-calendar', [FollowUpCalendarController::class, 'index'])->name('follow-up-calendar');
    Route::get('api/follow-up-calendar/events', [FollowUpCalendarController::class, 'events'])->name('follow-up-calendar.events');

    // Mail
    Route::get('mail', [MailController::class, 'index'])->name('mail');
    Route::get('mail/messages/{message}', [MailController::class, 'showPage'])->name('mail.view');
    Route::get('api/mail/messages', [MailController::class, 'messages'])->name('mail.messages');
    Route::get('api/mail/messages/{message}', [MailController::class, 'show'])->name('mail.show');
    Route::post('api/mail/messages', [MailController::class, 'send'])->name('mail.send');
    Route::put('api/mail/messages/{message}', [MailController::class, 'update'])->name('mail.update');
    Route::post('api/mail/messages/{message}/star', [MailController::class, 'toggleStar'])->name('mail.star');
    Route::post('api/mail/messages/{message}/read', [MailController::class, 'toggleRead'])->name('mail.read');
    Route::post('api/mail/messages/{message}/trash', [MailController::class, 'trash'])->name('mail.trash');
    Route::post('api/mail/messages/{message}/restore', [MailController::class, 'restore'])->name('mail.restore');
    Route::delete('api/mail/messages/{message}', [MailController::class, 'destroy'])->name('mail.destroy');
    Route::delete('api/mail/messages/{message}/unsend', [MailController::class, 'unsend'])->name('mail.unsend');
    Route::get('api/mail/labels', [MailController::class, 'labels'])->name('mail.labels');
    Route::post('api/mail/labels', [MailController::class, 'storeLabel'])->name('mail.labels.store');
    Route::delete('api/mail/labels/{label}', [MailController::class, 'deleteLabel'])->name('mail.labels.destroy');
    Route::post('api/mail/messages/{message}/labels/{label}', [MailController::class, 'toggleLabel'])->name('mail.labels.toggle');
    Route::get('api/mail/users', [MailController::class, 'users'])->name('mail.users');
    Route::get('api/mail/counts', [MailController::class, 'counts'])->name('mail.counts');

    // Gmail OAuth integration
    Route::get('api/gmail/status', [GmailController::class, 'status'])->name('gmail.status');
    Route::get('api/gmail/connect', [GmailController::class, 'connect'])->name('gmail.connect');
    Route::post('api/gmail/sync', [GmailController::class, 'sync'])->name('gmail.sync');
    Route::delete('api/gmail/disconnect', [GmailController::class, 'disconnect'])->name('gmail.disconnect');

    // Lead Activities
    Route::middleware('role_or_permission:super-admin|view leads')->group(function () {
        Route::get('leads/{lead}/activities/month-summary', [LeadActivityController::class, 'monthSummary'])->name('leads.activities.month-summary');
        Route::apiResource('lead-activities', LeadActivityController::class)->names('lead-activities');
    });

    // Notifications Page
    Route::get('/notifications', [NotificationController::class, 'page'])->name('notifications.page');

    // Notifications API
    Route::prefix('api/notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
        Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
        Route::post('/{id}/mark-read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
        Route::delete('/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
    });

    // User Performance Board (authorization handled in controller)
    Route::get('api/users/{user}/performance-board', [UserPerformanceController::class, 'show'])->name('users.performance-board');

    // Saved Filters
    Route::prefix('api')->group(function () {
        Route::apiResource('saved-filters', SavedFilterController::class)
            ->names('api.saved-filters');
    });

    // Call Sessions
    Route::prefix('api')->group(function () {
        Route::get('/leads/{lead}', [App\Http\Controllers\Api\Leads\LeadController::class, 'show'])->name('api.leads.show');
        Route::get('/leads/{lead}/calls', [CallSessionController::class, 'leadCallHistory'])->name('api.leads.calls');
        Route::get('/leads/{lead}/recordings', [CallSessionController::class, 'leadRecordings'])->name('api.leads.recordings');

        // Lead Files
        Route::get('/leads/{lead}/files', [LeadFileController::class, 'index'])->name('api.leads.files.index');
        Route::post('/leads/{lead}/files', [LeadFileController::class, 'store'])->name('api.leads.files.store');
        Route::get('/leads/{lead}/files/{media}/download', [LeadFileController::class, 'download'])->name('api.leads.files.download');
        Route::patch('/leads/{lead}/files/{media}/rename', [LeadFileController::class, 'rename'])->name('api.leads.files.rename');
        Route::patch('/leads/{lead}/files/{media}/move', [LeadFileController::class, 'moveToFolder'])->name('api.leads.files.move');
        Route::delete('/leads/{lead}/files/{media}', [LeadFileController::class, 'destroy'])->name('api.leads.files.destroy');

        // Lead Folders
        Route::get('/leads/{lead}/folders', [LeadFolderController::class, 'index'])->name('api.leads.folders.index');
        Route::post('/leads/{lead}/folders', [LeadFolderController::class, 'store'])->name('api.leads.folders.store');
        Route::patch('/leads/{lead}/folders/{folder}/rename', [LeadFolderController::class, 'rename'])->name('api.leads.folders.rename');
        Route::delete('/leads/{lead}/folders/{folder}', [LeadFolderController::class, 'destroy'])->name('api.leads.folders.destroy');

        // Lead PDF Submissions
        Route::get('/leads/{lead}/pdf-templates', [LeadPdfSubmissionController::class, 'templates'])->name('api.leads.pdf-templates');
        Route::get('/leads/{lead}/pdf-templates/{pdfTemplate}', [LeadPdfSubmissionController::class, 'showTemplate'])->name('api.leads.pdf-templates.show');
        Route::get('/leads/{lead}/pdf-submissions', [LeadPdfSubmissionController::class, 'index'])->name('api.leads.pdf-submissions.index');
        Route::post('/leads/{lead}/pdf-submissions', [LeadPdfSubmissionController::class, 'store'])->name('api.leads.pdf-submissions.store');
        Route::get('/leads/{lead}/pdf-submissions/{submission}', [LeadPdfSubmissionController::class, 'show'])->name('api.leads.pdf-submissions.show');
        Route::patch('/leads/{lead}/pdf-submissions/{submission}', [LeadPdfSubmissionController::class, 'update'])->name('api.leads.pdf-submissions.update');
        Route::delete('/leads/{lead}/pdf-submissions/{submission}', [LeadPdfSubmissionController::class, 'destroy'])->name('api.leads.pdf-submissions.destroy');

        // Lead Google Drive Files
        Route::get('/leads/{lead}/google-drive-files', [LeadGoogleDriveFileController::class, 'index'])->name('api.leads.google-drive-files.index');
        Route::post('/leads/{lead}/google-drive-files', [LeadGoogleDriveFileController::class, 'store'])->name('api.leads.google-drive-files.store');
        Route::delete('/leads/{lead}/google-drive-files/{linkedFile}', [LeadGoogleDriveFileController::class, 'destroy'])->name('api.leads.google-drive-files.destroy');

        // Storage Accounts API
        Route::get('/storage-accounts', [StorageAccountController::class, 'api'])->name('api.storage-accounts.index');
        Route::get('/storage-accounts/{storageAccount}/files', [GoogleDriveController::class, 'files'])->name('api.storage-accounts.files');
        Route::get('/storage-accounts/{storageAccount}/files/{fileId}/download', [GoogleDriveController::class, 'download'])->name('api.storage-accounts.files.download');
        Route::get('/calls/active', [CallSessionController::class, 'getActiveCall'])->name('api.calls.active');
        Route::get('/calls/{callSession}', [CallSessionController::class, 'show'])->name('api.calls.show');
        Route::get('/calls/{callSession}/recording', [CallSessionController::class, 'streamRecording'])->name('api.calls.recording');
        Route::post('/calls/state', [CallSessionController::class, 'storeCallState'])->name('api.calls.state');
        Route::post('/calls/initiate', [CallSessionController::class, 'initiateCall'])->name('api.calls.initiate');
        Route::patch('/calls/{sessionId}/status', [CallSessionController::class, 'updateStatus'])->name('api.calls.update-status');
        Route::get('/calls/signature/{signature}', [CallSessionController::class, 'getBySignature'])->name('api.calls.by-signature');

        // Phone Reveal
        Route::post('/leads/{lead}/phone-reveal', [PhoneRevealController::class, 'reveal'])->name('api.leads.phone-reveal');
    });

    // Dashboard & Metrics
    Route::prefix('api/dashboard')->middleware('role_or_permission:super-admin|view dashboard')->group(function () {
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
        Route::get('/quarterly-performance-trends', [DashboardController::class, 'quarterlyPerformanceTrends'])->name('dashboard.quarterly-performance-trends');
        Route::get('/ad-source-time-series', [DashboardController::class, 'adSourceTimeSeries'])->name('dashboard.ad-source-time-series');
    });

    // Reports (Inertia Pages + API)
    Route::middleware('role_or_permission:super-admin|view reports')->group(function () {
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('/reports/{type}', [ReportController::class, 'show'])->name('reports.show');
    });

    Route::prefix('api/reports')->middleware('role_or_permission:super-admin|view reports')->group(function () {
        Route::get('/leads-overall', [App\Http\Controllers\Api\ReportController::class, 'leadsOverall'])->name('reports.leads-overall');
        Route::get('/leads-by-office', [App\Http\Controllers\Api\ReportController::class, 'leadsByOffice'])->name('reports.leads-by-office');
        Route::get('/leads-by-support-agent', [App\Http\Controllers\Api\ReportController::class, 'leadsBySupportAgent'])->name('reports.leads-by-support-agent');
        Route::get('/leads-by-sales-rep', [App\Http\Controllers\Api\ReportController::class, 'leadsBySalesRep'])->name('reports.leads-by-sales-rep');
        Route::get('/leads-by-source', [App\Http\Controllers\Api\ReportController::class, 'leadsBySource'])->name('reports.leads-by-source');
        Route::get('/leads-by-service', [App\Http\Controllers\Api\ReportController::class, 'leadsByService'])->name('reports.leads-by-service');
        Route::get('/leads-conversion', [App\Http\Controllers\Api\ReportController::class, 'leadsConversion'])->name('reports.leads-conversion');
        Route::get('/leads-lost', [App\Http\Controllers\Api\ReportController::class, 'leadsLost'])->name('reports.leads-lost');
    });

    Route::prefix('api/metrics')->middleware('role_or_permission:super-admin|view analytics')->group(function () {
        Route::get('/conversion', [MetricsController::class, 'conversion'])->name('metrics.conversion');
        Route::get('/business-performance', [MetricsController::class, 'businessPerformance'])->name('metrics.business-performance');
        Route::get('/department-handoff', [MetricsController::class, 'departmentHandoff'])->name('metrics.department-handoff');
        Route::get('/system-adoption', [MetricsController::class, 'systemAdoption'])->name('metrics.system-adoption');
        Route::get('/user-performance', [MetricsController::class, 'userPerformance'])->name('metrics.user-performance');
        Route::get('/daily', [MetricsController::class, 'dailyMetrics'])->name('metrics.daily');
    });

    // AI Chat
    Route::prefix('api/ai-chat')->group(function () {
        Route::post('/message', [AiChatController::class, 'message'])->name('ai-chat.message');
        Route::get('/conversations', [AiChatController::class, 'conversations'])->name('ai-chat.conversations');
        Route::get('/conversations/{id}', [AiChatController::class, 'conversation'])->name('ai-chat.conversation');
        Route::get('/suggestions', [AiChatController::class, 'suggestions'])->name('ai-chat.suggestions');
    });

    // Roles
    Route::prefix('api/roles')->middleware('role:super-admin')->group(function () {
        Route::get('/', [RoleController::class, 'index']);
        Route::post('/', [RoleController::class, 'store']);
        Route::get('/{role}', [RoleController::class, 'show']);
        Route::put('/{role}', [RoleController::class, 'update']);
        Route::delete('/{role}', [RoleController::class, 'destroy']);
        Route::post('/{role}/assign-permissions', [RoleController::class, 'assignPermissions']);
    });

    // Permissions
    Route::prefix('api/permissions')->middleware('role:super-admin')->group(function () {
        Route::get('/', [PermissionController::class, 'index']);
        Route::post('/', [PermissionController::class, 'store']);
        Route::get('/matrix', [PermissionController::class, 'matrix']);
        Route::post('/bulk-update', [PermissionController::class, 'bulkUpdate']);
    });

    // Admin Facebook Token Management (Super Admin Only)
    Route::prefix('admin/facebook-tokens')->middleware('role:super-admin')->group(function () {
        Route::get('/overview', [FacebookTokenController::class, 'tokenOverview'])->name('admin.facebook.tokens.overview');
        Route::get('/expired', [FacebookTokenController::class, 'expiredTokens'])->name('admin.facebook.tokens.expired');
        Route::get('/expiring-soon', [FacebookTokenController::class, 'tokensExpiringSoon'])->name('admin.facebook.tokens.expiring');
        Route::get('/user/{userId}/details', [FacebookTokenController::class, 'userTokenDetails'])->name('admin.facebook.tokens.user.details');
        Route::post('/user/{userId}/revoke', [FacebookTokenController::class, 'revokeUserToken'])->name('admin.facebook.tokens.user.revoke');
        Route::post('/user/{userId}/notify', [FacebookTokenController::class, 'notifyUserTokenExpiry'])->name('admin.facebook.tokens.user.notify');
    });

    Route::get('/facebook/callback', [FacebookOAuthController::class, 'callback']);
    Route::get('/integrations/gmail/callback', [GmailController::class, 'callback'])->name('gmail.callback');

    Route::prefix('integrations')->middleware('role_or_permission:super-admin|manage integrations')->group(function () {
        Route::get('/', [IntegrationController::class, 'index'])->name('integrations');
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
        Route::get('/calendar', [GoogleCalendarController::class, 'configure'])->name('integrations.calendar');
        //        Route::get('/google', [\App\Http\Controllers\IntegrationController::class, 'google']);
        //        Route::get('/linkedin', [\App\Http\Controllers\IntegrationController::class, 'linkedin']);
    });

    Route::middleware('calendar.errors')->group(function () {
        // Calendar Integration Routes
        Route::prefix('calendar')->name('calendar.')->group(function () {
            Route::get('/', [GoogleCalendarController::class, 'index'])->name('index');
            Route::get('/status', [GoogleCalendarController::class, 'isAnyCalendarConnected'])->name('status');
            Route::post('/authorize', [GoogleCalendarController::class, 'initiateOAuth'])->name('authorize');
            Route::get('/callback', [GoogleCalendarController::class, 'callback'])->name('callback');
            Route::get('/{id}', [GoogleCalendarController::class, 'show'])->name('show');
            Route::put('/{id}', [GoogleCalendarController::class, 'update'])->name('update');
            Route::delete('/{id}', [GoogleCalendarController::class, 'disconnect'])->name('disconnect');
            Route::post('/{id}/refresh-token', [GoogleCalendarController::class, 'refreshToken'])->name('refresh-token');
            Route::get('/{id}/calendars', [GoogleCalendarController::class, 'getCalendars'])->name('calendars');
            Route::post('/{id}/events', [GoogleCalendarController::class, 'createEvent'])->name('events.store');
            Route::get('/{id}/status', [GoogleCalendarController::class, 'status'])->name('integration-status');
        });
    });

    // Call Management Routes
    Route::middleware('role_or_permission:super-admin|make calls')->group(function () {
        Route::resource('calls', CallController::class)->except(['edit', 'update', 'destroy'])->names('calls');
    });

    Route::middleware('role:super-admin')->group(function () {
        Route::get('workflows/schema/leads', [WorkflowController::class, 'getLeadSchema'])->name('workflows.schema.leads');
        Route::get('workflows/facebook/token-status', [WorkflowController::class, 'facebookTokenStatus'])->name('workflows.facebook-token-status');
        Route::get('workflows/new', [WorkflowController::class, 'createNew'])->name('workflows.new');
        Route::resource('workflows', WorkflowController::class)->except(['create'])->names('workflows');
        Route::post('workflows/{workflow}/duplicate', [WorkflowController::class, 'duplicate'])->name('workflows.duplicate');
        Route::post('workflows/{workflow}/test', [WorkflowController::class, 'testWorkflow'])->name('workflows.test');
        Route::get('workflows/{workflow}/pages', [WorkflowController::class, 'getPages'])->name('workflows.pages');
        Route::post('workflows/{workflow}/subscribe-webhook', [WorkflowController::class, 'subscribeWebhook'])->name('workflows.subscribe-webhook');
        Route::post('workflows/{workflow}/subscribe-app', [WorkflowController::class, 'subscribeApp'])->name('workflows.subscribe-app');
        Route::post('workflows/{workflow}/sync-pages', [WorkflowController::class, 'syncPages'])->name('workflows.sync-pages');
        Route::post('workflows/{workflow}/auto-setup-facebook', [WorkflowController::class, 'autoSetupFacebook'])->name('workflows.auto-setup-facebook');
        Route::get('workflows/{workflow}/lead-forms', [WorkflowController::class, 'getLeadForms'])->name('workflows.lead-forms');
        Route::post('workflows/{workflow}/test-trigger', [WorkflowController::class, 'testTrigger'])->name('workflows.test-trigger');
    });

    // Note: Task routes are defined above
    Route::post('tasks/{task}/complete', [TaskController::class, 'complete'])->name('tasks.complete');

    // Task API endpoints
    Route::prefix('api/tasks')->group(function () {
        Route::get('pending-reminders', [App\Http\Controllers\Api\TaskController::class, 'pendingReminders'])->name('api.tasks.pending-reminders');
        Route::post('{task}/complete', [App\Http\Controllers\Api\TaskController::class, 'complete'])->name('api.tasks.complete');
        Route::post('{task}/incomplete', [App\Http\Controllers\Api\TaskController::class, 'incomplete'])->name('api.tasks.incomplete');
    });

    // Account Management Routes
    Route::prefix('account')->name('account.')->group(function () {
        Route::get('/', [AccountController::class, 'index'])->name('index');
        Route::get('/show', [AccountController::class, 'show'])->name('show');
        Route::post('/profile', [AccountController::class, 'updateProfile'])->name('profile.update');
        Route::post('/password', [AccountController::class, 'updatePassword'])->name('password.update');
        Route::delete('/', [AccountController::class, 'destroy'])->name('destroy');
    });

    // Call API endpoints - Real-time call control
    Route::prefix('api/calls')->middleware('role_or_permission:super-admin|make calls')->group(function () {
        // Note: 'initiate' route is defined in CallSessionController (line 62) - removed duplicate here
        Route::post('{id}/answer', [App\Http\Controllers\Api\CallController::class, 'answer'])->name('api.calls.answer');
        Route::post('{id}/hangup', [App\Http\Controllers\Api\CallController::class, 'hangup'])->name('api.calls.hangup');
        Route::post('{id}/mute', [App\Http\Controllers\Api\CallController::class, 'mute'])->name('api.calls.mute');
        Route::post('{id}/unmute', [App\Http\Controllers\Api\CallController::class, 'unmute'])->name('api.calls.unmute');
        Route::post('{id}/hold', [App\Http\Controllers\Api\CallController::class, 'hold'])->name('api.calls.hold');
        Route::post('{id}/resume', [App\Http\Controllers\Api\CallController::class, 'resume'])->name('api.calls.resume');
        Route::post('{id}/transfer', [App\Http\Controllers\Api\CallController::class, 'transfer'])->name('api.calls.transfer');
        Route::get('recent', [App\Http\Controllers\Api\CallController::class, 'getRecent'])->name('api.calls.recent');
        Route::get('active', [App\Http\Controllers\Api\CallController::class, 'getActive'])->name('api.calls.active-list');
        Route::get('{id}', [App\Http\Controllers\Api\CallController::class, 'show'])->name('api.calls.detail');
    });

    // Legacy call control endpoints (AJAX) - kept for backward compatibility
    Route::middleware('role_or_permission:super-admin|make calls')->group(function () {
        Route::post('calls/{call_session}/answer', [CallController::class, 'answer'])->name('calls.answer');
        Route::post('calls/{call_session}/hangup', [CallController::class, 'hangup'])->name('calls.hangup');
        Route::post('calls/{call_session}/hold', [CallController::class, 'hold'])->name('calls.hold');
        Route::post('calls/{call_session}/unhold', [CallController::class, 'unhold'])->name('calls.unhold');
        Route::post('calls/{call_session}/mute', [CallController::class, 'mute'])->name('calls.mute');
        Route::post('calls/{call_session}/unmute', [CallController::class, 'unmute'])->name('calls.unmute');
        Route::post('calls/{call_session}/start-recording', [CallController::class, 'startRecording'])->name('calls.start-recording');
        Route::post('calls/{call_session}/stop-recording', [CallController::class, 'stopRecording'])->name('calls.stop-recording');
    });

    // Asterisk Inbound Call Management
    Route::prefix('api/asterisk')->group(function () {
        Route::post('/call-lead', [AsteriskCallController::class, 'storeCallLead'])->name('api.asterisk.call-lead');
        Route::post('/call-notes', [AsteriskCallController::class, 'saveCallNotes'])->name('api.asterisk.call-notes');
        Route::patch('/call-sessions/{sessionId}/link-lead', [AsteriskCallController::class, 'linkLeadToSession'])->name('api.asterisk.link-lead');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/teams.php';
