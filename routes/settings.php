<?php

use App\Http\Controllers\Settings\Forms\ApplicationsController as FormsApplicationsController;
use App\Http\Controllers\Settings\Forms\ProgramsController as FormsProgramsController;
use App\Http\Controllers\Settings\Forms\TemplatesMappingsController as FormsTemplatesMappingsController;
use App\Http\Controllers\Settings\GoogleDriveController;
use App\Http\Controllers\Settings\LeadSourceManagementController;
use App\Http\Controllers\Settings\LeadStatusManagementController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\PermissionManagementController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\RoleManagementController;
use App\Http\Controllers\Settings\StorageAccountController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');

    Route::put('settings/password', [PasswordController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    Route::get('settings/storage-accounts', [StorageAccountController::class, 'index'])
        ->name('settings.storage-accounts');

    Route::prefix('settings/storage-accounts/google-drive')->group(function () {
        Route::get('connect', [GoogleDriveController::class, 'redirect'])->name('settings.storage.google-drive.connect');
        Route::get('callback', [GoogleDriveController::class, 'callback'])->name('settings.storage.google-drive.callback');
        Route::delete('{storageAccount}/disconnect', [GoogleDriveController::class, 'disconnect'])->name('settings.storage.google-drive.disconnect');
    });

    Route::get('settings/management', function () {
        return Inertia::render('settings/management/index');
    })->middleware('role:super-admin')->name('settings.management');

    Route::middleware('role:super-admin')->group(function () {
        Route::get('settings/management/roles', [RoleManagementController::class, 'index'])->name('settings.management.roles');
        Route::get('settings/management/permissions', [PermissionManagementController::class, 'index'])->name('settings.management.permissions');
        Route::get('settings/management/lead-sources', [LeadSourceManagementController::class, 'index'])->name('settings.management.lead-sources');
        Route::get('settings/management/lead-statuses', [LeadStatusManagementController::class, 'index'])->name('settings.management.lead-statuses');
        // Forms automation — Programs list (keeps the existing URL)
        Route::get('settings/management/pdf-templates', [FormsProgramsController::class, 'index'])->name('settings.management.pdf-templates');

        // Forms automation — sub-pages
        Route::prefix('settings/management/forms')->name('settings.management.forms.')->group(function () {
            Route::get('programs/{program}', [FormsProgramsController::class, 'show'])
                ->where('program', '[0-9]+')
                ->name('programs.show');

            Route::get('programs/{program}/templates/{formTemplate}/mappings', [FormsTemplatesMappingsController::class, 'show'])
                ->where(['program' => '[0-9]+', 'formTemplate' => '[0-9]+'])
                ->name('templates.mappings');

            Route::get('applications', [FormsApplicationsController::class, 'index'])->name('applications.index');
            Route::get('applications/create', [FormsApplicationsController::class, 'create'])->name('applications.create');
            Route::get('applications/{application}', [FormsApplicationsController::class, 'show'])
                ->where('application', '[0-9]+')
                ->name('applications.show');
            Route::get('applications/{application}/edit', [FormsApplicationsController::class, 'edit'])
                ->where('application', '[0-9]+')
                ->name('applications.edit');
        });
    });
});
