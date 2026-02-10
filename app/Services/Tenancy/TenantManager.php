<?php

namespace App\Services\Tenancy;

use App\Models\Organization;

class TenantManager
{
    private ?Organization $current = null;

    public function set(Organization $org): void
    {
        $this->current = $org;
    }

    public function get(): ?Organization
    {
        return $this->current;
    }

    public function id(): ?int
    {
        return $this->current?->id;
    }

    public function check(): bool
    {
        return $this->current !== null;
    }

    public function forgetCurrent(): void
    {
        $this->current = null;
    }
}
