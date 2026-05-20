<?php

namespace App\Services\Forms\Data;

use App\Enums\Forms\FieldType;

final class InspectedField
{
    public function __construct(
        public readonly int $page,
        public readonly string $name,
        public readonly FieldType $type,
        public readonly ?array $rectPdf,
        public readonly ?array $pageSizePdf,
        public readonly ?array $exportValues,
    ) {}
}
