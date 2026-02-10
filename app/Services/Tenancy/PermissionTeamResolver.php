<?php

namespace App\Services\Tenancy;

use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Contracts\PermissionsTeamResolver;

class PermissionTeamResolver implements PermissionsTeamResolver
{
    /**
     * @param  int|string|Model|null  $id
     */
    public function setPermissionsTeamId($id): void
    {
        // Team ID is resolved dynamically from TenantManager
    }

    public function getPermissionsTeamId(): int|string|null
    {
        return app(TenantManager::class)->id();
    }
}
