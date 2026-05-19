<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Team extends Model
{
    protected $fillable = [
        'name',
        'avatar',
        'user_id',
        'personal_team',
    ];

    protected $appends = ['avatar_url'];

    protected function casts(): array
    {
        return [
            'personal_team' => 'boolean',
        ];
    }

    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar ? Storage::disk('public')->url($this->avatar) : null;
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function allUsers(): BelongsToMany
    {
        return $this->members()->orWhere('users.id', $this->user_id);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(TeamInvitation::class);
    }

    public function hasUser(User $user): bool
    {
        return $this->members()->where('user_id', $user->id)->exists()
            || $this->user_id === $user->id;
    }

    public function hasUserWithEmail(string $email): bool
    {
        return $this->members()->where('email', $email)->exists();
    }

    public function userIsOwner(User $user): bool
    {
        return $this->user_id === $user->id;
    }

    public function userRole(User $user): ?string
    {
        if ($this->userIsOwner($user)) {
            return 'admin';
        }

        $membership = $this->members()->where('user_id', $user->id)->first();

        return $membership?->pivot->role;
    }

    public function userHasRole(User $user, string $role): bool
    {
        return $this->userRole($user) === $role;
    }
}
