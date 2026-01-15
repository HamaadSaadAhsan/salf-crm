<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LeadActivityResource;
use App\Http\Resources\LeadResource;
use App\Models\Lead;
use App\Models\LeadActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class LeadActivityController extends Controller
{
    private function buildActivityResponse(Request $request, LeadActivity $activity)
    {
        $activity->load(['user', 'lead']);

        // Refresh lead and return lead data
        $lead = $activity->lead->load(['assignedTo', 'createdBy', 'service', 'source']);

        // Invalidate leads cache
        Cache::tags(['leads', 'leads_list'])->flush();

        // Return appropriate response based on request type
        if ($request->expectsJson()) {
            return response()->json([
                'activity' => LeadActivityResource::make($activity),
                'lead' => LeadResource::make($lead),
            ]);
        }

        // For Inertia requests, return the activity resource directly
        return LeadActivityResource::make($activity);
    }

    public function store(Request $request)
    {
        $request->validate([
            'lead_id' => 'required|exists:leads,id',
            'type' => ['nullable', Rule::in(['call', 'email', 'meeting', 'note', 'message', 'task', 'follow_up', 'status_change', 'assignment_change'])],
            'description' => 'required_without:attachments|string|max:1000',
            'subject' => 'nullable|string|max:255',
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'scheduled_at' => 'nullable|date',
            'due_at' => 'nullable|date',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|max:10240', // Max 10MB per file
        ]);

        $lead = Lead::findOrFail($request->lead_id);

        // Default to 'note' type if no type is provided (treated as comment)
        $activityType = $request->type ?: 'note';

        // Auto-complete note/comment type activities
        $isNoteType = in_array($activityType, ['note', 'message']);

        // Handle file attachments
        $attachmentData = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $fileName = time().'_'.$file->getClientOriginalName();
                $filePath = $file->storeAs('lead_activities', $fileName, 'public');

                $attachmentData[] = [
                    'original_name' => $file->getClientOriginalName(),
                    'file_name' => $fileName,
                    'file_path' => $filePath,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'uploaded_at' => now()->toISOString(),
                ];
            }
        }

        $activity = LeadActivity::create([
            'lead_id' => $request->lead_id,
            'user_id' => Auth::id(),
            'type' => $activityType,
            'subject' => $request->subject ?: ucfirst($activityType).' activity',
            'description' => $request->description ?: (! empty($attachmentData) ? 'File attachment' : ''),
            'priority' => $request->priority ?? 'medium',
            'scheduled_at' => $request->scheduled_at,
            'due_at' => $request->due_at,
            'status' => $isNoteType ? 'completed' : 'pending',
            'completed_at' => $isNoteType ? now() : null,
            'attachments' => ! empty($attachmentData) ? $attachmentData : null,
        ]);

        // Update lead's last activity timestamp
        $lead->touch('last_activity_at');

        return $this->buildActivityResponse($request, $activity);
    }

    public function index(Request $request)
    {
        $request->validate([
            'lead_id' => 'required|exists:leads,id',
            'month' => 'nullable|date_format:Y-m',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:50',
        ]);

        $query = LeadActivity::where('lead_id', $request->lead_id)
            ->with(['user:id,name,email,avatar']);

        // Filter by type if provided
        if ($request->has('type') && $request->type) {
            $types = explode(',', $request->type);

            // If 'note' is in the filter, also include NULL types (considered as comments)
            if (in_array('note', $types)) {
                $query->where(function ($q) use ($types) {
                    $q->whereIn('type', $types)
                        ->orWhereNull('type');
                });
            } else {
                $query->whereIn('type', $types);
            }
        }

        // Filter by month if provided (YYYY-MM format)
        if ($request->has('month') && $request->month) {
            $year = substr($request->month, 0, 4);
            $month = substr($request->month, 5, 2);

            $query->whereYear('created_at', $year)
                ->whereMonth('created_at', $month);
        }

        $activities = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 5));

        return LeadActivityResource::collection($activities);
    }

    /**
     * Get activities grouped by month with counts
     */
    public function monthSummary(Request $request, Lead $lead)
    {
        $request->validate([
            'per_month' => 'nullable|integer|min:1|max:20',
        ]);

        $perMonth = $request->get('per_month', 5);

        // Get all activities grouped by month
        $activities = LeadActivity::where('lead_id', $lead->id)
            ->select('id', 'lead_id', 'user_id', 'status', 'created_at', 'subject', 'description', 'notes', 'duration_minutes', 'category', 'type', 'attachments', 'metadata')
            ->with(['user:id,name,email,avatar'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Group by month
        $grouped = $activities->groupBy(function ($activity) {
            return \Carbon\Carbon::parse($activity->created_at)->format('Y-m');
        });

        // Build response with limited items per month
        $response = $grouped->map(function ($monthActivities, $monthKey) use ($perMonth) {
            $total = $monthActivities->count();
            $items = $monthActivities->take($perMonth);

            return [
                'month' => $monthKey,
                'month_label' => \Carbon\Carbon::parse($monthKey.'-01')->format('F Y'),
                'total' => $total,
                'loaded' => $items->count(),
                'has_more' => $total > $perMonth,
                'activities' => LeadActivityResource::collection($items),
            ];
        })->values();

        return response()->json([
            'data' => $response,
            'meta' => [
                'total_months' => $grouped->count(),
                'total_activities' => $activities->count(),
            ],
        ]);
    }

    public function update(Request $request, LeadActivity $activity)
    {
        $request->validate([
            'status' => ['nullable', Rule::in(['pending', 'completed', 'cancelled'])],
            'outcome' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ]);

        $activity->update($request->only(['status', 'outcome', 'notes']));

        if ($request->status === 'completed' && ! $activity->completed_at) {
            $activity->update(['completed_at' => now()]);
        }

        return $this->buildActivityResponse($request, $activity);
    }

    public function destroy(LeadActivity $activity)
    {
        $activity->delete();

        return response()->json(['message' => 'Activity deleted successfully']);
    }
}
