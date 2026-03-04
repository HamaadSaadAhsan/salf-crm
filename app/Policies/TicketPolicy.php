<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('super-admin');
    }

    public function view(User $user, Ticket $ticket): bool
    {
        return $user->hasRole('super-admin') || $ticket->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Ticket $ticket): bool
    {
        return $user->hasRole('super-admin');
    }

    public function delete(User $user, Ticket $ticket): bool
    {
        return $user->hasRole('super-admin');
    }

    public function comment(User $user, Ticket $ticket): bool
    {
        return $user->hasRole('super-admin') || $ticket->user_id === $user->id;
    }
}
