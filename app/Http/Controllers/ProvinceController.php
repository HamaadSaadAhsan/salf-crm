<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProvinceRequest;
use App\Http\Requests\UpdateProvinceRequest;
use App\Models\Province;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProvinceController extends Controller
{
    public function index(Request $request): JsonResponse|Response
    {
        $query = Province::query()
            ->with('country:id,name,code')
            ->withCount('cities');

        if ($request->filled('country_id')) {
            $query->where('country_id', $request->country_id);
        }

        $provinces = $query->orderBy('name')
            ->get()
            ->map(function ($province) {
                return [
                    'id' => $province->id,
                    'country_id' => $province->country_id,
                    'country' => $province->country ? [
                        'id' => $province->country->id,
                        'name' => $province->country->name,
                        'code' => $province->country->code,
                    ] : null,
                    'name' => $province->name,
                    'code' => $province->code,
                    'is_active' => $province->is_active,
                    'cities_count' => $province->cities_count,
                    'created_at' => $province->created_at?->toDateTimeString(),
                    'updated_at' => $province->updated_at?->toDateTimeString(),
                ];
            });

        if ($request->expectsJson()) {
            return response()->json([
                'provinces' => $provinces,
            ]);
        }

        return Inertia::render('provinces/index', [
            'provinces' => $provinces,
        ]);
    }

    public function store(StoreProvinceRequest $request)
    {
        $province = Province::create($request->validated());
        $province->load('country:id,name,code');

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Province created successfully',
                'province' => $province,
            ], 201);
        }

        return back()->with('success', 'Province created successfully');
    }

    public function show(Province $province): JsonResponse
    {
        $province->load('country:id,name,code');
        $province->loadCount('cities');

        return response()->json([
            'province' => $province,
        ]);
    }

    public function update(UpdateProvinceRequest $request, Province $province)
    {
        $province->update($request->validated());
        $province->load('country:id,name,code');

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Province updated successfully',
                'province' => $province,
            ]);
        }

        return back()->with('success', 'Province updated successfully');
    }

    public function destroy(Province $province)
    {
        if ($province->cities()->count() > 0) {
            if (request()->expectsJson()) {
                return response()->json([
                    'message' => 'Cannot delete province with associated cities',
                ], 422);
            }

            return back()->withErrors(['error' => 'Cannot delete province with associated cities']);
        }

        $province->delete();

        if (request()->expectsJson()) {
            return response()->json([
                'message' => 'Province deleted successfully',
            ]);
        }

        return back()->with('success', 'Province deleted successfully');
    }
}
