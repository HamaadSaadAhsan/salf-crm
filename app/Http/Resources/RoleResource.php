<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class RoleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => Str::slug($this->name),
            'guard_name' => $this->guard_name,
            'description' => $this->when(isset($this->description), $this->description),
            'color' => $this->getColor(),
            'users_count' => $this->getUsersCount(),
            'permissions_count' => $this->getPermissionsCount(),
            'permissions' => $this->whenLoaded('permissions', function () {
                return $this->permissions->map(function ($permission) {
                    return [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'guard_name' => $permission->guard_name,
                    ];
                });
            }),
            'users' => $this->whenLoaded('users', function () {
                return $this->users->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'email_verified_at' => $user->email_verified_at?->toISOString(),
                    ];
                });
            }),
            'direct_permissions' => $this->whenLoaded('permissions', function () {
                return $this->permissions->map(function ($permission) {
                    return [
                        'id' => $permission->id,
                        'name' => $permission->name,
                        'guard_name' => $permission->guard_name,
                    ];
                });
            }),
            'all_permissions' => $this->when(
                $this->relationLoaded('permissions'),
                function () {
                    return $this->getAllPermissions()->map(function ($permission) {
                        return [
                            'id' => $permission->id,
                            'name' => $permission->name,
                            'guard_name' => $permission->guard_name,
                        ];
                    });
                }
            ),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Get role color with fallback
     */
    private function getColor(): string
    {
        // Check if the color attribute exists (custom field)
        if (isset($this->color) && $this->color) {
            return $this->color;
        }

        // Generate consistent color based on role name
        $colorMap = [
            'super admin' => 'bg-red-500',
            'admin' => 'bg-orange-500',
            'manager' => 'bg-blue-500',
            'editor' => 'bg-purple-500',
            'author' => 'bg-green-500',
            'contributor' => 'bg-yellow-500',
            'subscriber' => 'bg-gray-500',
            'user' => 'bg-indigo-500',
            'guest' => 'bg-pink-500',
        ];

        $key = strtolower($this->name);

        if (isset($colorMap[$key])) {
            return $colorMap[$key];
        }

        // Generate color based on name hash
        $colors = array_values($colorMap);
        $index = abs(crc32($this->name)) % count($colors);
        return $colors[$index];
    }

    /**
     * Get users count using Spatie's relationship
     */
    private function getUsersCount(): int
    {
        // Use Spatie's built-in users relationship
        try {
            return $this->users()->count();
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get permissions count using Spatie's relationship
     */
    private function getPermissionsCount(): int
    {
        // Use Spatie's built-in permissions relationship
        try {
            return $this->permissions()->count();
        } catch (\Exception $e) {
            return 0;
        }
    }
}
