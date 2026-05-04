<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TeamMemberController extends Controller
{
    public function store(Request $request, Team $team): RedirectResponse
    {
        $this->authorize('addTeamMember', $team);

        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'role' => ['required', 'string', 'in:admin,member'],
        ]);

        $user = User::where('email', $validated['email'])->firstOrFail();

        if ($team->hasUser($user)) {
            return back()->withErrors(['email' => 'User is already a member of this team.']);
        }

        $team->members()->attach($user, ['role' => $validated['role']]);

        return back()->with('success', 'Team member added.');
    }

    public function update(Request $request, Team $team, User $user): RedirectResponse
    {
        $this->authorize('updateTeamMember', $team);

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:admin,member'],
        ]);

        $team->members()->updateExistingPivot($user->id, ['role' => $validated['role']]);

        return back()->with('success', 'Member role updated.');
    }

    public function destroy(Team $team, User $user): RedirectResponse
    {
        $this->authorize('removeTeamMember', $team);

        if ($team->userIsOwner($user)) {
            return back()->withErrors(['user' => 'The team owner cannot be removed.']);
        }

        $team->members()->detach($user);

        // If the removed member's current team is this team, switch them to another.
        if ($user->current_team_id === $team->id) {
            $nextTeam = $user->allTeams()->first();
            $user->forceFill(['current_team_id' => $nextTeam?->id])->save();
        }

        return back()->with('success', 'Team member removed.');
    }
}
