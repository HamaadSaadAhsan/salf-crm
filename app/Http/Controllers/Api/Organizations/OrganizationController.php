<?php

namespace App\Http\Controllers\Api\Organizations;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrganizationRequest;
use App\Http\Requests\UpdateOrganizationRequest;
use App\Http\Resources\OrganizationResource;
use App\Models\Organization;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OrganizationController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $organizations = Organization::query()
            ->with('owner:id,name,email')
            ->withCount('users')
            ->orderBy('name')
            ->get();

        return OrganizationResource::collection($organizations);
    }

    public function store(StoreOrganizationRequest $request): JsonResponse
    {
        $organization = Organization::create($request->validated());

        return response()->json([
            'message' => 'Organization created successfully',
            'data' => new OrganizationResource($organization->load('owner')),
        ], 201);
    }

    public function update(UpdateOrganizationRequest $request, Organization $organization): JsonResponse
    {
        $organization->update($request->validated());

        return response()->json([
            'message' => 'Organization updated successfully',
            'data' => new OrganizationResource($organization->load('owner')),
        ]);
    }

    public function destroy(Organization $organization): JsonResponse
    {
        if ($organization->users()->exists()) {
            return response()->json([
                'message' => 'Cannot delete organization with assigned members',
            ], 422);
        }

        $organization->delete();

        return response()->json(['message' => 'Organization deleted successfully']);
    }

    public function toggleActive(Organization $organization): JsonResponse
    {
        $organization->update(['is_active' => ! $organization->is_active]);

        return response()->json([
            'message' => $organization->is_active ? 'Organization activated' : 'Organization deactivated',
            'data' => new OrganizationResource($organization->load('owner')),
        ]);
    }
}
