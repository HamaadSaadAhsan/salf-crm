<?php

namespace App\Policies;

use App\Models\LeadPdfSubmission;
use App\Models\User;

class LeadPdfSubmissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('view documents');
    }

    public function view(User $user, LeadPdfSubmission $submission): bool
    {
        return $user->hasPermissionTo('view documents');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('view documents');
    }

    public function update(User $user, LeadPdfSubmission $submission): bool
    {
        return $user->hasPermissionTo('view documents')
            && ($user->hasRole('super-admin') || $submission->submitted_by === $user->id);
    }

    public function delete(User $user, LeadPdfSubmission $submission): bool
    {
        return $user->hasRole('super-admin') || $submission->submitted_by === $user->id;
    }
}
