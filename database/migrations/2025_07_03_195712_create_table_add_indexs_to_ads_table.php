<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            // Add index on campaign_external_id if not exists
            if (!$this->indexExists('ads', 'ads_campaign_external_id_index')) {
                $table->index('campaign_external_id', 'ads_campaign_external_id_index');
            }

            // Add index on ad_set_external_id if not exists
            if (!$this->indexExists('ads', 'ads_ad_set_external_id_index')) {
                $table->index('ad_set_external_id', 'ads_ad_set_external_id_index');
            }

            // Add composite index for common queries
            if (!$this->indexExists('ads', 'ads_user_campaign_adset_index')) {
                $table->index(['user_id', 'campaign_external_id', 'ad_set_external_id'], 'ads_user_campaign_adset_index');
            }

            // Add index on last_synced for cleanup operations
            if (!$this->indexExists('ads', 'ads_last_synced_index')) {
                $table->index('last_synced', 'ads_last_synced_index');
            }
        });

        Schema::table('ad_sets', function (Blueprint $table) {
            // Add index on campaign_external_id if not exists
            if (!$this->indexExists('ad_sets', 'ad_sets_campaign_external_id_index')) {
                $table->index('campaign_external_id', 'ad_sets_campaign_external_id_index');
            }

            // Add composite index for user and campaign queries
            if (!$this->indexExists('ad_sets', 'ad_sets_user_campaign_index')) {
                $table->index(['user_id', 'campaign_external_id'], 'ad_sets_user_campaign_index');
            }

            // Add index on last_synced
            if (!$this->indexExists('ad_sets', 'ad_sets_last_synced_index')) {
                $table->index('last_synced', 'ad_sets_last_synced_index');
            }
        });

        Schema::table('campaigns', function (Blueprint $table) {
            // Add index on user_id if not exists
            if (!$this->indexExists('campaigns', 'campaigns_user_id_index')) {
                $table->index('user_id', 'campaigns_user_id_index');
            }

            // Add index on last_synced
            if (!$this->indexExists('campaigns', 'campaigns_last_synced_index')) {
                $table->index('last_synced', 'campaigns_last_synced_index');
            }

            // Add index on status for filtering active campaigns
            if (!$this->indexExists('campaigns', 'campaigns_status_index')) {
                $table->index('status', 'campaigns_status_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'ads_campaign_external_id_index');
            $this->dropIndexIfExists($table, 'ads_ad_set_external_id_index');
            $this->dropIndexIfExists($table, 'ads_user_campaign_adset_index');
            $this->dropIndexIfExists($table, 'ads_last_synced_index');
        });

        Schema::table('ad_sets', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'ad_sets_campaign_external_id_index');
            $this->dropIndexIfExists($table, 'ad_sets_user_campaign_index');
            $this->dropIndexIfExists($table, 'ad_sets_last_synced_index');
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $this->dropIndexIfExists($table, 'campaigns_user_id_index');
            $this->dropIndexIfExists($table, 'campaigns_last_synced_index');
            $this->dropIndexIfExists($table, 'campaigns_status_index');
        });
    }

    /**
     * Check if an index exists on a table (PostgreSQL compatible)
     */
    private function indexExists(string $table, string $indexName): bool
    {
        try {
            $exists = DB::select("
                SELECT 1
                FROM pg_indexes
                WHERE tablename = ? AND indexname = ?
            ", [$table, $indexName]);

            return !empty($exists);
        } catch (\Exception $e) {
            // If query fails, assume index doesn't exist
            return false;
        }
    }

    /**
     * Drop index if it exists (safe drop)
     */
    private function dropIndexIfExists(Blueprint $table, string $indexName): void
    {
        try {
            // Get table name from blueprint
            $tableName = $table->getTable();

            if ($this->indexExists($tableName, $indexName)) {
                $table->dropIndex($indexName);
            }
        } catch (\Exception $e) {
            // Ignore errors when dropping indexes (they might not exist)
            // This is safe for rollbacks
        }
    }
};
