<?php

namespace App\Http\Controllers;

use App\Models\Office;
use App\Models\Zone;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OfficeController extends Controller
{
    public function index()
    {
        $offices = Office::with('zone')
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(function ($office) {
                return [
                    'id' => $office->id,
                    'zone_id' => $office->zone_id,
                    'zone' => $office->zone ? [
                        'id' => $office->zone->id,
                        'name' => $office->zone->name,
                        'code' => $office->zone->code,
                    ] : null,
                    'name' => $office->name,
                    'code' => $office->code,
                    'address' => $office->address,
                    'city' => $office->city,
                    'country_code' => $office->country_code,
                    'postal_code' => $office->postal_code,
                    'phone' => $office->phone,
                    'email' => $office->email,
                    'is_active' => $office->is_active,
                    'users_count' => $office->users_count,
                    'created_at' => $office->created_at?->toDateTimeString(),
                    'updated_at' => $office->updated_at?->toDateTimeString(),
                ];
            });

        $zones = Zone::active()->orderBy('name')->get(['id', 'name', 'code']);

        return Inertia::render('offices/index', [
            'offices' => $offices,
            'zones' => $zones,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'zone_id' => 'nullable|exists:zones,id',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:offices,code',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'country_code' => 'nullable|string|size:2',
            'postal_code' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
            'metadata' => 'nullable|array',
        ]);

        $office = Office::create($validated);

        return back()->with('success', 'Office created successfully');
    }

    public function update(Request $request, Office $office)
    {
        $validated = $request->validate([
            'zone_id' => 'nullable|exists:zones,id',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:offices,code,'.$office->id,
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:255',
            'country_code' => 'nullable|string|size:2',
            'postal_code' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
            'metadata' => 'nullable|array',
        ]);

        $office->update($validated);

        return back()->with('success', 'Office updated successfully');
    }

    public function destroy(Office $office)
    {
        if ($office->users()->count() > 0) {
            return back()->withErrors(['error' => 'Cannot delete office with assigned users']);
        }

        $office->delete();

        return back()->with('success', 'Office deleted successfully');
    }
}
