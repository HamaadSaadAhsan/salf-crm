<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SavedFilterRequest;
use App\Models\SavedFilter;
use Illuminate\Http\JsonResponse;

class SavedFilterController extends Controller
{
    public function index(): JsonResponse
    {
        $filters = SavedFilter::query()
            ->where('user_id', auth()->id())
            ->orderBy('name')
            ->get();

        return response()->json($filters);
    }

    public function store(SavedFilterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        if (! empty($validated['is_default'])) {
            SavedFilter::query()
                ->where('user_id', auth()->id())
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $filter = SavedFilter::create([
            ...$validated,
            'user_id' => auth()->id(),
        ]);

        return response()->json($filter, 201);
    }

    public function update(SavedFilterRequest $request, SavedFilter $savedFilter): JsonResponse
    {
        if ($savedFilter->user_id !== auth()->id()) {
            abort(403);
        }

        $validated = $request->validated();

        if (! empty($validated['is_default'])) {
            SavedFilter::query()
                ->where('user_id', auth()->id())
                ->where('is_default', true)
                ->where('id', '!=', $savedFilter->id)
                ->update(['is_default' => false]);
        }

        $savedFilter->update($validated);

        return response()->json($savedFilter);
    }

    public function destroy(SavedFilter $savedFilter): JsonResponse
    {
        if ($savedFilter->user_id !== auth()->id()) {
            abort(403);
        }

        $savedFilter->delete();

        return response()->json(null, 204);
    }
}
