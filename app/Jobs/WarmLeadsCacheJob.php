<?php

namespace App\Jobs;

use App\Models\Lead;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class WarmLeadsCacheJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 300; // 5 minutes

    public function __construct(
        public array $filters = []
    ) {
        // Set queue priority based on filter type
        $this->onQueue($this->determineQueue());
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            $cacheKey = Lead::getListCacheKey($this->filters);
            $cacheTags = ['leads', 'leads_list'];

            // Build query based on filters
            $query = Lead::query()->with(['service', 'source', 'assignedTo']);

            // Apply filters
            $this->applyFilters($query);

            // Execute query and cache results
            $leads = $query->limit(100)->get();

            // Cache the results with appropriate TTL (15 minutes)
            cache()->tags($cacheTags)->put($cacheKey, $leads, 900);

            Log::info('Lead cache warmed successfully', [
                'filters' => $this->filters,
                'count' => $leads->count(),
                'cache_key' => $cacheKey,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to warm lead cache', [
                'error' => $e->getMessage(),
                'filters' => $this->filters,
            ]);

            throw $e;
        }
    }

    /**
     * Apply filters to the query
     */
    private function applyFilters($query): void
    {
        foreach ($this->filters as $key => $value) {
            match ($key) {
                'inquiry_status' => $query->where('inquiry_status', $value),
                'priority' => $query->where('priority', $value),
                'hot_leads' => $value ? $query->hotLeads() : null,
                'active_only' => $value ? $query->active() : null,
                'is_assigned' => $value
                    ? $query->whereNotNull('assigned_to')
                    : $query->whereNull('assigned_to'),
                'overdue_follow_ups' => $value
                    ? $query->where('next_follow_up_at', '<', now())->whereNotNull('next_follow_up_at')
                    : null,
                'created_within_days' => $query->where('created_at', '>=', now()->subDays($value)),
                'min_lead_score' => $query->where('lead_score', '>=', $value),
                'assigned_to' => $query->where('assigned_to', $value),
                'service_id' => $query->where('service_id', $value),
                'lead_source_id' => $query->where('lead_source_id', $value),
                'city' => $query->where('city', $value),
                'country' => $query->where('country', $value),
                default => null,
            };
        }
    }

    /**
     * Determine which queue to use based on filter priority
     */
    private function determineQueue(): string
    {
        // High priority filters go to 'high' queue
        if (isset($this->filters['hot_leads']) ||
            isset($this->filters['priority']) && in_array($this->filters['priority'], ['high', 'urgent']) ||
            isset($this->filters['inquiry_status']) && $this->filters['inquiry_status'] === 'new') {
            return 'high';
        }

        // Everything else goes to default 'default' queue
        return 'default';
    }

    /**
     * Handle a job failure
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Warm leads cache job failed permanently', [
            'filters' => $this->filters,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}
