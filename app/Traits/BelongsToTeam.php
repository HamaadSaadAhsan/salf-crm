<?php

namespace App\Traits;

use App\Models\Team;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTeam
{
    public static function bootBelongsToTeam(): void
    {
        // Auto-assign team_id from authenticated user's current team on creation.
        static::creating(function ($model) {
            if (! $model->team_id && auth()->check() && auth()->user()->current_team_id) {
                $model->team_id = auth()->user()->current_team_id;
            }
        });

        // Restrict all queries to the authenticated user's current team.
        // Super-admins bypass the scope and can see all teams' data.
        static::addGlobalScope('team', function (Builder $query) {
            if (! auth()->check()) {
                return;
            }

            $user = auth()->user();

            if ($user->hasRole('super-admin')) {
                return;
            }

            if ($user->current_team_id) {
                $query->where($query->getModel()->getTable().'.team_id', $user->current_team_id);
            }
        });
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /** Remove the team scope for a query (useful for admin views). */
    public static function withoutTeamScope(): Builder
    {
        return static::withoutGlobalScope('team');
    }
}
