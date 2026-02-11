<?php

use App\Http\Controllers\Settings\LeadSourceManagementController;
use App\Http\Controllers\Settings\LeadStatusManagementController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\PermissionManagementController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\RoleManagementController;
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

    Route::get('settings/management', function () {
        return Inertia::render('settings/management/index');
    })->middleware('role:super-admin')->name('settings.management');

    Route::middleware('role:super-admin')->group(function () {
        Route::get('settings/management/roles', [RoleManagementController::class, 'index'])->name('settings.management.roles');
        Route::get('settings/management/permissions', [PermissionManagementController::class, 'index'])->name('settings.management.permissions');
        Route::get('settings/management/lead-sources', [LeadSourceManagementController::class, 'index'])->name('settings.management.lead-sources');
        Route::get('settings/management/lead-statuses', [LeadStatusManagementController::class, 'index'])->name('settings.management.lead-statuses');
    });
});
