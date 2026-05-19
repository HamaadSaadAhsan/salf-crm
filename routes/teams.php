<?php

use App\Http\Controllers\CurrentTeamController;
use App\Http\Controllers\TeamController;
use App\Http\Controllers\TeamInvitationController;
use App\Http\Controllers\TeamMemberController;
use Illuminate\Support\Facades\Route;

// Public invitation acceptance (no auth required)
Route::get('invitations/{token}', [TeamInvitationController::class, 'show'])->name('invitations.accept');
Route::post('invitations/{token}', [TeamInvitationController::class, 'register'])->name('invitations.register');

Route::middleware(['auth', 'verified'])->group(function () {
    // Switch current team
    Route::put('current-team', [CurrentTeamController::class, 'update'])->name('current-team.update');

    // Teams list (super-admin only)
    Route::get('teams', [TeamController::class, 'index'])->name('teams.index');

    // Team CRUD
    Route::get('teams/create', [TeamController::class, 'create'])->name('teams.create');
    Route::get('teams/current', [TeamController::class, 'current'])->name('teams.current');
    Route::post('teams', [TeamController::class, 'store'])->name('teams.store');
    Route::get('teams/{team}', [TeamController::class, 'show'])->name('teams.show');
    Route::put('teams/{team}', [TeamController::class, 'update'])->name('teams.update');
    Route::delete('teams/{team}', [TeamController::class, 'destroy'])->name('teams.destroy');

    // Team members
    Route::post('teams/{team}/members', [TeamMemberController::class, 'store'])->name('team-members.store');
    Route::put('teams/{team}/members/{user}', [TeamMemberController::class, 'update'])->name('team-members.update');
    Route::delete('teams/{team}/members/{user}', [TeamMemberController::class, 'destroy'])->name('team-members.destroy');

    // Team invitations
    Route::post('teams/{team}/invitations', [TeamInvitationController::class, 'store'])->name('team-invitations.store');
    Route::get('team-invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('team-invitations.accept');
    Route::delete('team-invitations/{invitation}', [TeamInvitationController::class, 'destroy'])->name('team-invitations.destroy');
});
