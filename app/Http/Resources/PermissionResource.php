<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;

class PermissionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => Str::slug($this->name),
            'guard_name' => $this->guard_name,
            'category' => $this->getCategory(),
            'action' => $this->getAction(),
            'subject' => $this->getSubject(),
            'description' => $this->when(isset($this->description), $this->description),
            'roles' => RoleResource::collection($this->whenLoaded('roles')),
            'roles_count' => $this->when(
                method_exists($this->resource, 'roles'),
                function () {
                    try {
                        return $this->roles()->count();
                    } catch (\Exception $e) {
                        return 0;
                    }
                }
            ),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Extract category from permission name
     * e.g., "users.create" -> "Users"
     */
    private function getCategory(): string
    {
        $parts = explode('.', $this->name);
        return ucfirst($parts[0] ?? 'General');
    }

    /**
     * Extract action from permission name
     * e.g., "users.create" -> "Create"
     */
    private function getAction(): string
    {
        $parts = explode('.', $this->name);
        return ucfirst($parts[1] ?? $this->name);
    }

    /**
     * Extract subject from permission name
     * e.g., "users.create" -> "users"
     */
    private function getSubject(): string
    {
        $parts = explode('.', $this->name);
        return $parts[0] ?? $this->name;
    }
}
