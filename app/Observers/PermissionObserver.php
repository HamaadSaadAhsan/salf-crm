<?php

namespace App\Observers;

use App\Services\CacheService;
use Spatie\Permission\Models\Permission;

class PermissionObserver
{
    public function created(Permission $permission): void
    {
        $this->clearCache();
    }

    public function updated(Permission $permission): void
    {
        $this->clearCache();
    }

    public function deleted(Permission $permission): void
    {
        $this->clearCache();
    }

    private function clearCache(): void
    {
        CacheService::flush('permissions');
        CacheService::flush('roles');
    }
}
