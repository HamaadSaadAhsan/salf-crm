<?php

namespace App\Http\Controllers\Api\Forms;

use App\Http\Controllers\Controller;
use App\Models\Forms\FieldMapping;
use App\Models\Forms\Program;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ProgramSchemaController extends Controller
{
    /**
     * Returns the structured data-entry schema for a program derived from its field mappings.
     * Groups canonical paths by their top-level prefix (e.g. main_applicant, spouse, children).
     */
    public function show(Program $program): JsonResponse
    {
        $paths = FieldMapping::query()
            ->whereHas('formTemplate', fn ($q) => $q->where('program_id', $program->id)->where('is_active', true))
            ->distinct()
            ->pluck('canonical_path')
            ->filter()
            ->unique()
            ->sort()
            ->values();

        if ($paths->isEmpty()) {
            return response()->json(['sections' => [], 'has_mappings' => false]);
        }

        $sections = [];

        foreach ($paths as $path) {
            $parts = explode('.', $path, 2);
            $sectionKey = $parts[0];
            $fieldKey = $parts[1] ?? $parts[0];

            if (! isset($sections[$sectionKey])) {
                $sections[$sectionKey] = [
                    'key' => $sectionKey,
                    'label' => $this->toLabel($sectionKey),
                    'fields' => [],
                ];
            }

            $sections[$sectionKey]['fields'][] = [
                'path' => $path,
                'key' => $fieldKey,
                'label' => $this->toLabel($fieldKey),
            ];
        }

        return response()->json([
            'sections' => array_values($sections),
            'has_mappings' => true,
        ]);
    }

    private function toLabel(string $key): string
    {
        return Str::of($key)
            ->replace('_', ' ')
            ->title()
            ->toString();
    }
}
