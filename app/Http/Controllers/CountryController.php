<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCountryRequest;
use App\Http\Requests\UpdateCountryRequest;
use App\Models\Country;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CountryController extends Controller
{
    public function index(Request $request): JsonResponse|Response
    {
        $countries = Country::query()
            ->withCount('provinces')
            ->orderBy('name')
            ->get()
            ->map(function ($country) {
                return [
                    'id' => $country->id,
                    'name' => $country->name,
                    'code' => $country->code,
                    'iso2' => $country->iso2,
                    'phone_code' => $country->phone_code,
                    'currency' => $country->currency,
                    'currency_symbol' => $country->currency_symbol,
                    'is_active' => $country->is_active,
                    'provinces_count' => $country->provinces_count,
                    'created_at' => $country->created_at?->toDateTimeString(),
                    'updated_at' => $country->updated_at?->toDateTimeString(),
                ];
            });

        if ($request->expectsJson()) {
            return response()->json([
                'countries' => $countries,
            ]);
        }

        return Inertia::render('countries/index', [
            'countries' => $countries,
        ]);
    }

    public function store(StoreCountryRequest $request)
    {
        $country = Country::create($request->validated());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Country created successfully',
                'country' => $country,
            ], 201);
        }

        return back()->with('success', 'Country created successfully');
    }

    public function show(Country $country): JsonResponse
    {
        $country->loadCount('provinces');

        return response()->json([
            'country' => $country,
        ]);
    }

    public function update(UpdateCountryRequest $request, Country $country)
    {
        $country->update($request->validated());

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Country updated successfully',
                'country' => $country,
            ]);
        }

        return back()->with('success', 'Country updated successfully');
    }

    public function destroy(Country $country)
    {
        if ($country->provinces()->count() > 0) {
            if (request()->expectsJson()) {
                return response()->json([
                    'message' => 'Cannot delete country with associated provinces',
                ], 422);
            }

            return back()->withErrors(['error' => 'Cannot delete country with associated provinces']);
        }

        $country->delete();

        if (request()->expectsJson()) {
            return response()->json([
                'message' => 'Country deleted successfully',
            ]);
        }

        return back()->with('success', 'Country deleted successfully');
    }
}
