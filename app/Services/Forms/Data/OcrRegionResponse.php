<?php

namespace App\Services\Forms\Data;

final class OcrRegionResponse
{
    public function __construct(
        public readonly string $text,
        public readonly float $confidence,
    ) {}
}
