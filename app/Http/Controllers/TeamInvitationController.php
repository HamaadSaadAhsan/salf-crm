<?php

namespace App\Http\Controllers;

use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use App\Notifications\TeamInvitationNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class TeamInvitationController extends Controller
{
    public function store(Request $request, Team $team): RedirectResponse
    {
        $this->authorize('inviteTeamMember', $team);

        $validRoles = Role::pluck('name')->toArray();

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', 'string', 'in:admin,member'],
            'system_role' => ['required', 'string', 'in:'.implode(',', $validRoles)],
        ]);

        if ($team->invitations()->where('email', $validated['email'])->exists()) {
            return back()->withErrors(['email' => 'An invitation has already been sent to this email.']);
        }

        if (User::where('email', $validated['email'])->whereHas('teams', fn ($q) => $q->where('team_id', $team->id))->exists()) {
            return back()->withErrors(['email' => 'This user is already a team member.']);
        }

        $invitation = $team->invitations()->create([
            'email' => $validated['email'],
            'token' => Str::random(64),
            'role' => $validated['role'],
            'system_role' => $validated['system_role'],
        ]);

        (new AnonymousNotifiable)
            ->route('mail', $validated['email'])
            ->notify(new TeamInvitationNotification($invitation));

        return back()->with('success', 'Invitation sent.');
    }

    public function show(string $token): Response|RedirectResponse
    {
        $invitation = TeamInvitation::where('token', $token)
            ->with('team:id,name')
            ->firstOrFail();

        if (User::where('email', $invitation->email)->exists()) {
            return redirect()->route('login')
                ->with('info', 'You already have an account. Log in to accept the invitation.');
        }

        return inertia('auth/AcceptInvitation', [
            'invitation' => [
                'token' => $invitation->token,
                'email' => $invitation->email,
                'team_name' => $invitation->team->name,
                'team_avatar_url' => $invitation->team->avatar_url,
            ],
        ]);
    }

    public function register(Request $request, string $token): RedirectResponse
    {
        $invitation = TeamInvitation::where('token', $token)->firstOrFail();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $invitation->email,
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        if ($invitation->system_role) {
            $user->assignRole($invitation->system_role);
        }

        $team = $invitation->team;
        $team->members()->attach($user, ['role' => $invitation->role ?? 'member']);
        $user->forceFill(['current_team_id' => $team->id])->save();

        $invitation->delete();

        Auth::login($user);

        return redirect()->route('dashboard')
            ->with('success', "Welcome to {$team->name}!");
    }

    public function destroy(TeamInvitation $invitation): RedirectResponse
    {
        $this->authorize('inviteTeamMember', $invitation->team);

        $invitation->delete();

        return back()->with('success', 'Invitation cancelled.');
    }
}
