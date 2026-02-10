<?php

namespace App\Models\Concerns;

use App\Models\Organization;
use App\Services\Tenancy\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope('organization', function (Builder $query) {
            if ($orgId = app(TenantManager::class)->id()) {
                $query->where($query->getModel()->getTable().'.organization_id', $orgId);
            }
        });

        static::creating(function (Model $model) {
            if (! $model->organization_id && $orgId = app(TenantManager::class)->id()) {
                $model->organization_id = $orgId;
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
