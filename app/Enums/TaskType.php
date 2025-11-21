<?php

namespace App\Enums;

enum TaskType: string
{
    case FOLLOW_UP = 'follow_up';
    case CALL = 'call';
    case MESSAGE = 'message';
    case MEETING = 'meeting';
    case EMAIL = 'email';
    case OTHER = 'other';

    public function label(): string
    {
        return match ($this) {
            self::FOLLOW_UP => 'Follow Up',
            self::CALL => 'Call',
            self::MESSAGE => 'Message',
            self::MEETING => 'Meeting',
            self::EMAIL => 'Email',
            self::OTHER => 'Other',
        };
    }

    public function color(): string
    {
        return match ($this) {
            self::FOLLOW_UP => 'blue',
            self::CALL => 'green',
            self::MESSAGE => 'purple',
            self::MEETING => 'orange',
            self::EMAIL => 'cyan',
            self::OTHER => 'gray',
        };
    }

    public function icon(): string
    {
        return match ($this) {
            self::FOLLOW_UP => 'clock',
            self::CALL => 'phone',
            self::MESSAGE => 'message-circle',
            self::MEETING => 'users',
            self::EMAIL => 'mail',
            self::OTHER => 'circle',
        };
    }
}
