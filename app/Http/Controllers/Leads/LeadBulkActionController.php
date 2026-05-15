<?php

namespace App\Http\Controllers\Leads;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class LeadBulkActionController extends Controller
{
    private const VALID_STATUSES = [
        'new', 'contacted', 'qualified', 'assigned_to_advisor',
        'requalify', 'proposal', 'won', 'lost', 'nurturing', 'converted', 'closed',
    ];

    public function assign(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('edit leads'), 403);

        $data = $request->validate([
            'lead_ids' => ['required', 'array', 'min:1', 'max:200'],
            'lead_ids.*' => ['required', 'string'],
            'assigned_to_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        $assignee = User::findOrFail($data['assigned_to_id']);

        $updated = Lead::query()
            ->whereIn('id', $data['lead_ids'])
            ->update([
                'assigned_to' => $assignee->id,
                'assigned_date' => now(),
            ]);

        Cache::tags(['leads'])->flush();

        return response()->json([
            'updated' => $updated,
            'message' => "Assigned {$updated} leads to {$assignee->name}.",
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermissionTo('edit leads'), 403);

        $data = $request->validate([
            'lead_ids' => ['required', 'array', 'min:1', 'max:200'],
            'lead_ids.*' => ['required', 'string'],
            'inquiry_status' => ['required', Rule::in(self::VALID_STATUSES)],
        ]);

        $updated = Lead::query()
            ->whereIn('id', $data['lead_ids'])
            ->update(['inquiry_status' => $data['inquiry_status']]);

        Cache::tags(['leads'])->flush();

        return response()->json([
            'updated' => $updated,
            'message' => "Updated status to {$data['inquiry_status']} for {$updated} leads.",
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('super-admin'), 403);

        $data = $request->validate([
            'lead_ids' => ['required', 'array', 'min:1', 'max:200'],
            'lead_ids.*' => ['required', 'string'],
        ]);

        $deleted = Lead::query()
            ->whereIn('id', $data['lead_ids'])
            ->delete();

        Cache::tags(['leads'])->flush();

        return response()->json([
            'deleted' => $deleted,
            'message' => "Deleted {$deleted} leads.",
        ]);
    }
}
