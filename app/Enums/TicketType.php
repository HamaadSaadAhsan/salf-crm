<?php

namespace App\Enums;

enum TicketType: string
{
    case BugReport = 'bug_report';
    case FeatureRequest = 'feature_request';

    public function label(): string
    {
        return match ($this) {
            self::BugReport => 'Bug Report',
            self::FeatureRequest => 'Feature Request',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::BugReport => 'red',
            self::FeatureRequest => 'blue',
        };
    }
}
