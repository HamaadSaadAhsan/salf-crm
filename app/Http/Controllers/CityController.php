<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCityRequest;
use App\Http\Requests\UpdateCityRequest;
use App\Models\City;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CityController extends Controller
{
    public function index(Request $request): JsonResponse|Response
    {
        $query = City::query()
            ->with('province.country:id,name,code')
            ->withCount('zones');

        if ($request->filled('province_id')) {
            $query->where('province_id', $request->province_id);
        }

        if ($request->filled('country_code')) {
            $query->whereHas('province.country', function ($q) use ($request) {
                $q->where('code', $request->country_code)
                    ->orWhere('iso2', $request->country_code);
            });
        }

        $cities = $query->orderBy('name')
            ->get()
            ->map(function ($city) {
                return [
                    'id' => $city->id,
                    'province_id' => $city->province_id,
                    'province' => $city->province ? [
                        'id' => $city->province->id,
                        'name' => $city->province->name,
                        'code' => $city->province->code,
                        'country' => $city->province->country ? [
                            'id' => $city->province->country->id,
                            'name' => $city->province->country->name,
                            'code' => $city->province->country->code,
                        ] : null,
                    ] : null,
                    'name' => $city->name,
                    'code' => $city->code,
                    'latitude' => $city->latitude,
                    'longitude' => $city->longitude,
                    'is_active' => $city->is_active,
                    'zones_count' => $city->zones_count,
                    'created_at' => $city->created_at?->toDateTimeString(),
                    'updated_at' => $city->updated_at?->toDateTimeString(),
                ];
            });

        if ($request->expectsJson()) {
            return response()->json([
                'cities' => $cities,
            ]);
        }

        return Inertia::render('cities/index', [
            'cities' => $cities,
        ]);
    }

    public function store(StoreCityRequest $request)
    {
        $city = City::create($request->validated());
        $city->load('province.country:id,name,code');

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'City created successfully',
                'city' => $city,
            ], 201);
        }

        return back()->with('success', 'City created successfully');
    }

    public function show(City $city): JsonResponse
    {
        $city->load('province.country:id,name,code');
        $city->loadCount('zones');

        return response()->json([
            'city' => $city,
        ]);
    }

    public function update(UpdateCityRequest $request, City $city)
    {
        $city->update($request->validated());
        $city->load('province.country:id,name,code');

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'City updated successfully',
                'city' => $city,
            ]);
        }

        return back()->with('success', 'City updated successfully');
    }

    public function destroy(City $city)
    {
        if ($city->zones()->count() > 0) {
            if (request()->expectsJson()) {
                return response()->json([
                    'message' => 'Cannot delete city with associated zones',
                ], 422);
            }

            return back()->withErrors(['error' => 'Cannot delete city with associated zones']);
        }

        $city->delete();

        if (request()->expectsJson()) {
            return response()->json([
                'message' => 'City deleted successfully',
            ]);
        }

        return back()->with('success', 'City deleted successfully');
    }
}
