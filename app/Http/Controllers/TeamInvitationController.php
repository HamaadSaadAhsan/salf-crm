<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TeamInvitationController extends Controller
{
    public function store(Request $request, Team $team): RedirectResponse
    {
        $this->authorize('inviteTeamMember', $team);

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', 'string', 'in:admin,member'],
        ]);

        if ($team->invitations()->where('email', $validated['email'])->exists()) {
            return back()->withErrors(['email' => 'An invitation has already been sent to this email.']);
        }

        if (User::where('email', $validated['email'])->whereHas('teams', fn ($q) => $q->where('team_id', $team->id))->exists()) {
            return back()->withErrors(['email' => 'This user is already a team member.']);
        }

        $team->invitations()->create([
            'email' => $validated['email'],
            'role' => $validated['role'],
        ]);

        // TODO: dispatch a TeamInvitationCreated notification/mail here.

        return back()->with('success', 'Invitation sent.');
    }

    public function accept(Request $request, TeamInvitation $invitation): RedirectResponse
    {
        $user = $request->user();

        if ($user->email !== $invitation->email) {
            abort(403, 'This invitation is not for you.');
        }

        $team = $invitation->team;

        if (! $team->hasUser($user)) {
            $team->members()->attach($user, ['role' => $invitation->role]);
        }

        $invitation->delete();

        $user->switchTeam($team);

        return redirect()->route('teams.show', $team)
            ->with('success', "You have joined {$team->name}.");
    }

    public function destroy(TeamInvitation $invitation): RedirectResponse
    {
        $this->authorize('inviteTeamMember', $invitation->team);

        $invitation->delete();

        return back()->with('success', 'Invitation cancelled.');
    }
}
