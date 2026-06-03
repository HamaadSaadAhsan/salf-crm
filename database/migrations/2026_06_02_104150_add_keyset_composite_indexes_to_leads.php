<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Composite `(sort_field, seq)` indexes backing keyset/cursor pagination.
     *
     * The keyset query orders by the chosen sort field plus the unique `seq`
     * tiebreaker and seeks with a `(field, seq)` boundary predicate. A single
     * btree on `(field, seq)` (scannable in either direction) turns the plan
     * from "Index Scan + Incremental Sort + Filter" into a pure index-range
     * scan with no sort step. Each index is partial on the active (non
     * soft-deleted) set to stay small and match the `deleted_at IS NULL`
     * predicate every leads query carries.
     *
     * @var list<array{name: string, columns: string}>
     */
    private array $indexes = [
        ['name' => 'leads_keyset_created_at_seq', 'columns' => 'created_at, seq'],
        ['name' => 'leads_keyset_updated_at_seq', 'columns' => 'updated_at, seq'],
        ['name' => 'leads_keyset_last_activity_at_seq', 'columns' => 'last_activity_at, seq'],
        ['name' => 'leads_keyset_next_follow_up_at_seq', 'columns' => 'next_follow_up_at, seq'],
        ['name' => 'leads_keyset_assigned_date_seq', 'columns' => 'assigned_date, seq'],
        ['name' => 'leads_keyset_lead_score_seq', 'columns' => 'lead_score, seq'],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $index) {
            DB::statement(
                "CREATE INDEX IF NOT EXISTS {$index['name']} ON leads ({$index['columns']}) WHERE deleted_at IS NULL"
            );
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $index) {
            DB::statement("DROP INDEX IF EXISTS {$index['name']}");
        }
    }
};
