<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

abstract class FacebookIntegrationEvent
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $integrationId,
        public array $data = [],
        public ?string $userId = null
    ) {
        $this->userId = $userId ?? auth()->id();
    }
}