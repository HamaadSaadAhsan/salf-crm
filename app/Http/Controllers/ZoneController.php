<?php

namespace App\Http\Controllers;

use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ZoneController extends Controller
{
    public function index()
    {
        $zones = Zone::with(['cities.province.country'])
            ->withCount(['users', 'leads', 'offices'])
            ->orderBy('name')
            ->get()
            ->map(function ($zone) {
                $firstCity = $zone->cities->first();
                $province = $firstCity?->province;
                $country = $province?->country;

                return [
                    'id' => $zone->id,
                    'name' => $zone->name,
                    'code' => $zone->code,
                    'description' => $zone->description,
                    'country_code' => $zone->country_code,
                    'is_active' => $zone->is_active,
                    'users_count' => $zone->users_count,
                    'leads_count' => $zone->leads_count,
                    'offices_count' => $zone->offices_count,
                    'cities_count' => $zone->cities->count(),
                    'city_ids' => $zone->cities->pluck('id')->toArray(),
                    'province_id' => $province?->id,
                    'country_id' => $country?->id,
                    'created_at' => $zone->created_at?->toDateTimeString(),
                    'updated_at' => $zone->updated_at?->toDateTimeString(),
                ];
            });

        return Inertia::render('zones/index', [
            'zones' => $zones,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:zones,name',
            'code' => 'nullable|string|max:50|unique:zones,code',
            'description' => 'nullable|string',
            'country_code' => 'nullable|string|size:2',
            'is_active' => 'boolean',
            'metadata' => 'nullable|array',
            'city_ids' => 'nullable|array',
            'city_ids.*' => 'integer|exists:cities,id',
        ]);

        $cityIds = $validated['city_ids'] ?? [];
        unset($validated['city_ids']);

        $zone = Zone::create($validated);

        if (! empty($cityIds)) {
            $zone->cities()->sync($cityIds);
        }

        return back()->with('success', 'Zone created successfully');
    }

    public function update(Request $request, Zone $zone)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:zones,name,'.$zone->id,
            'code' => 'nullable|string|max:50|unique:zones,code,'.$zone->id,
            'description' => 'nullable|string',
            'country_code' => 'nullable|string|size:2',
            'is_active' => 'boolean',
            'metadata' => 'nullable|array',
            'city_ids' => 'nullable|array',
            'city_ids.*' => 'integer|exists:cities,id',
        ]);

        $cityIds = $validated['city_ids'] ?? [];
        unset($validated['city_ids']);

        $zone->update($validated);
        $zone->cities()->sync($cityIds);

        return back()->with('success', 'Zone updated successfully');
    }

    public function destroy(Zone $zone)
    {
        if ($zone->users()->count() > 0 || $zone->leads()->count() > 0) {
            return back()->withErrors(['error' => 'Cannot delete zone with assigned users or leads']);
        }

        $zone->delete();

        return back()->with('success', 'Zone deleted successfully');
    }
}
