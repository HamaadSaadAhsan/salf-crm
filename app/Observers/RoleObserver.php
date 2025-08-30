<?php

namespace App\Observers;

use App\Services\CacheService;
use Spatie\Permission\Models\Role;

class RoleObserver
{
    public function created(Role $role): void
    {
        $this->clearCache();
    }

    public function updated(Role $role): void
    {
        $this->clearCache();
    }

    public function deleted(Role $role): void
    {
        $this->clearCache();
    }

    private function clearCache(): void
    {
        CacheService::flush('roles');
        CacheService::flush('permissions');
    }
}
