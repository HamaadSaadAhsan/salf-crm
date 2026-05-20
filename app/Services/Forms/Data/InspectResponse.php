<?php

namespace App\Services\Forms\Data;

final class InspectResponse
{
    /**
     * @param  InspectedField[]  $fields
     */
    public function __construct(
        public readonly int $pageCount,
        public readonly array $fields,
    ) {}
}
