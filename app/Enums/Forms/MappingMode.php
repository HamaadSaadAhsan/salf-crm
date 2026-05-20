<?php

namespace App\Enums\Forms;

enum MappingMode: string
{
    case NAME = 'name';
    case GEOMETRY = 'geometry';
    case DOCX_JINJA = 'docx_jinja';
}
