<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::find($key);

        return $setting ? $setting->value : $default;
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    public static function all($columns = ['*']): Collection
    {
        return parent::all($columns);
    }

    public static function asArray(): array
    {
        $defaults = [
            'calling_enabled' => false,
            'phone_reveal_duration' => 30,
        ];

        return array_merge($defaults, static::all()->pluck('value', 'key')->toArray());
    }
}
