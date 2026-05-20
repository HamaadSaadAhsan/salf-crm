<?php

namespace App\Enums\Forms;

enum ApplicationStatus: string
{
    case DRAFT = 'draft';
    case IN_PROGRESS = 'in_progress';
    case SUBMITTED = 'submitted';
    case APPROVED = 'approved';
    case REJECTED = 'rejected';
    case ARCHIVED = 'archived';
}
