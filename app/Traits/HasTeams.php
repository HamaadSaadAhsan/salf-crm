<?php

namespace App\Traits;

use App\Models\Team;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait HasTeams
{
    public function currentTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'current_team_id');
    }

    public function ownedTeams(): HasMany
    {
        return $this->hasMany(Team::class, 'user_id');
    }

    public function teams(): BelongsToMany
    {
        return $this->belongsToMany(Team::class, 'team_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    /** All teams the user belongs to (or all teams for super-admins). */
    public function allTeams(): Collection
    {
        if ($this->isSuperAdmin()) {
            return Team::all();
        }

        return $this->ownedTeams->merge($this->teams);
    }

    public function isOwnerOfTeam(Team $team): bool
    {
        return $team->user_id === $this->id;
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }

    public function isMemberOfTeam(Team $team): bool
    {
        return $this->isSuperAdmin()
            || $this->isOwnerOfTeam($team)
            || $this->teams()->where('team_id', $team->id)->exists();
    }

    public function teamRole(Team $team): ?string
    {
        if ($this->isSuperAdmin() || $this->isOwnerOfTeam($team)) {
            return 'admin';
        }

        $membership = $this->teams()->where('team_id', $team->id)->first();

        return $membership?->pivot->role;
    }

    public function hasTeamRole(Team $team, string $role): bool
    {
        return $this->teamRole($team) === $role;
    }

    /** Switch the user's current team and persist to session. */
    public function switchTeam(Team $team): bool
    {
        if (! $this->isMemberOfTeam($team)) {
            return false;
        }

        $this->forceFill(['current_team_id' => $team->id])->save();
        $this->setRelation('currentTeam', $team);

        return true;
    }

    /** Ensure a personal team exists; called on first login / registration. */
    public function createPersonalTeam(): Team
    {
        $team = $this->ownedTeams()->create([
            'name' => explode(' ', $this->name)[0]."'s Team",
            'personal_team' => true,
        ]);

        $this->forceFill(['current_team_id' => $team->id])->save();

        return $team;
    }
}
