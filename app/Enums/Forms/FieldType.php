<?php

namespace App\Enums\Forms;

enum FieldType: string
{
    case TEXT = 'text';
    case CHECKBOX = 'checkbox';
    case RADIO = 'radio';
    case SIGNATURE = 'signature';
    case UNKNOWN = 'unknown';
}
