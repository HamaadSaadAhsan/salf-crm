<?php

namespace App\Models;

use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Status extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'name',
        'color',
        'order',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($status) {
            if (empty($status->order)) {
                $status->order = (static::max('order') ?? 0) + 1;
            }
            if (empty($status->color)) {
                $status->color = '#'.Str::random(6);
            }
        });
    }

    public function getCacheKey(string $suffix = ''): string
    {
        return "status:{$this->id}".($suffix ? ":{$suffix}" : '');
    }

    public static function getListCacheKey(array $params = []): string
    {
        return 'status:list:'.md5(serialize($params));
    }
}
