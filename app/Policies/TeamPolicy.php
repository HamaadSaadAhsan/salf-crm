<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    /** Any authenticated user can list their own teams. */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /** Members can view the team. */
    public function view(User $user, Team $team): bool
    {
        return $user->isMemberOfTeam($team);
    }

    /** Only super admins can create teams. */
    public function create(User $user): bool
    {
        return $user->hasRole('super-admin');
    }

    /** Only the team owner can update team settings. */
    public function update(User $user, Team $team): bool
    {
        return $user->isOwnerOfTeam($team);
    }

    /** Only the team owner can delete the team (non-personal teams only). */
    public function delete(User $user, Team $team): bool
    {
        return ! $team->personal_team && $user->isOwnerOfTeam($team);
    }

    /** Only super admins can add members. */
    public function addTeamMember(User $user, Team $team): bool
    {
        return $user->hasRole('super-admin');
    }

    /** Only the team owner can remove members; members can remove themselves. */
    public function removeTeamMember(User $user, Team $team): bool
    {
        return $user->isOwnerOfTeam($team);
    }

    /** Only super admins can send invitations. */
    public function inviteTeamMember(User $user, Team $team): bool
    {
        return $user->hasRole('super-admin');
    }

    /** Only the team owner can update member roles. */
    public function updateTeamMember(User $user, Team $team): bool
    {
        return $user->isOwnerOfTeam($team);
    }
}
