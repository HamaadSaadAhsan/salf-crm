<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        if (is_null($this->resource)) {
            return [];
        }
        
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'active_services_count' => $this->whenCounted('activeServices'),
            'leads_count' => $this->whenCounted('leads'),
            'active_leads_count' => $this->whenCounted('active_leads_count'),
            'active_services' => $this->whenLoaded('activeServices', function () {
                return $this->activeServices->map(function ($service) {
                    return [
                        'id' => $service->id,
                        'name' => $service->name,
                        'country_code' => $service->country_code,
                        'country_name' => $service->country_name,
                        'parent' => $service->relationLoaded('parent') ? [
                            'id' => $service->parent?->id,
                            'name' => $service->parent?->name,
                        ] : null,
                    ];
                });
            }),
            'services' => $this->whenLoaded('services', function () {
                return $this->services->map(function ($service) {
                    return [
                        'id' => $service->id,
                        'name' => $service->name,
                        'assigned_at' => $service->pivot->assigned_at,
                        'status' => $service->pivot->status,
                        'notes' => $service->pivot->notes,
                        'metadata' => $service->pivot->metadata,
                    ];
                });
            }),
            'leads' => $this->whenLoaded('leads', function () {
                return $this->leads->map(function ($lead) {
                    return [
                        'id' => $lead->id,
                        'name' => $lead->name,
                        'email' => $lead->email,
                        'service_id' => $lead->service_id,
                        'assigned_to' => $lead->assigned_to,
                        'inquiry_status' => $lead->inquiry_status,
                        'created_at' => $lead->created_at?->toISOString(),
                        'service' => $lead->relationLoaded('service') ? [
                            'id' => $lead->service?->id,
                            'name' => $lead->service?->name,
                        ] : null,
                    ];
                });
            }),
            'roles' => $this->whenLoaded('roles', function () {
                return $this->roles->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                        'guard_name' => $role->guard_name,
                    ];
                });
            }),
            'permissions' => $this->when(
                $this->relationLoaded('roles'),
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
}
