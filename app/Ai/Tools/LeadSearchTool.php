<?php

namespace App\Ai\Tools;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class LeadSearchTool implements Tool
{
    public function __construct(
        protected User $user
    ) {}

    public function description(): Stringable|string
    {
        return 'Search for specific leads by name, email, phone, or status. Returns matching leads with their key details.';
    }

    public function handle(Request $request): Stringable|string
    {
        $searchTerm = $request['query'] ?? '';
        $status = $request['status'] ?? null;
        $limit = min((int) ($request['limit'] ?? '10'), 20);

        $query = Lead::query()->with(['service', 'source', 'assignedTo']);

        // Role-based scoping
        if ($this->user->hasAnyRole(['support-agent', 'senior-support-agent', 'sales-rep', 'senior-sales-rep'])) {
            $query->where('assigned_to', $this->user->id);
        }

        if ($searchTerm) {
            $query->fullTextSearch($searchTerm);
        }

        if ($status) {
            $query->byStatus($status);
        }

        $leads = $query->orderByDesc('last_activity_at')
            ->limit($limit)
            ->get()
            ->map(fn (Lead $lead) => [
                'id' => $lead->id,
                'name' => $lead->name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'status' => $lead->inquiry_status,
                'priority' => $lead->priority,
                'lead_score' => $lead->lead_score,
                'service' => $lead->service?->name,
                'source' => $lead->source?->name,
                'assigned_to' => $lead->assignedTo?->name,
                'created_at' => $lead->created_at->toDateString(),
                'last_activity' => $lead->last_activity_at?->diffForHumans(),
            ]);

        return json_encode([
            'count' => $leads->count(),
            'leads' => $leads->toArray(),
        ]);
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'query' => $schema->string()
                ->description('Search term to find leads by name, email, phone, or details')
                ->required(),
            'status' => $schema->string()
                ->description('Filter by lead status')
                ->enum(['new', 'assigned_to_cro', 'contacted', 'qualified', 'assigned_to_advisor', 'proposal', 'converted', 'won', 'lost', 'unqualified', 'requalify', 'nurturing']),
            'limit' => $schema->string()
                ->description('Maximum number of results to return (default: 10, max: 20)')
                ->default('10'),
        ];
    }
}
