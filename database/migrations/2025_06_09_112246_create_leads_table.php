<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Enable PostGIS extension if not already enabled
        DB::statement('CREATE EXTENSION IF NOT EXISTS postgis');

        Schema::create('leads', function (Blueprint $table) {
            // Primary key with UUID for better distribution
            $table->uuid('id')->primary();

            // Core lead information
            $table->string('name')->index();
            $table->string('email')->unique()->index();
            $table->string('phone', 20)->nullable()->index();
            $table->string('occupation')->nullable()->index();

            // Address information with proper indexing
            $table->text('address')->nullable();
            $table->string('country', 3)->nullable()->index(); // ISO country codes
            $table->string('city')->nullable()->index();

            // Geographic coordinates for advanced querying
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            // Relationships with proper foreign keys
            $table->foreignId('service_id')->nullable()->constrained('services')->cascadeOnDelete();
            $table->foreignId('lead_source_id')->nullable()->constrained('lead_sources')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();

            // Lead details and metadata
            $table->text('detail')->nullable();
            $table->json('budget')->nullable(); // Store budget as JSON for flexibility
            $table->json('custom_fields')->nullable(); // Extensible custom fields

            // Status and workflow
            $table->enum('inquiry_status', ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'nurturing'])
                ->default('new')
                ->index();
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])
                ->default('medium')
                ->index();
            $table->enum('inquiry_type', ['phone', 'email', 'web', 'referral', 'social', 'advertisement'])
                ->nullable()
                ->index();

            // Tracking and analytics
            $table->string('inquiry_country', 3)->nullable()->index();
            $table->timestamp('assigned_date')->nullable();
            $table->uuid('ticket_id')->nullable()->index();
            $table->timestamp('ticket_date')->nullable();
            $table->uuid('import_id')->nullable()->index();
            $table->string('external_id')->nullable()->unique(); // For external integrations

            // Score and qualification
            $table->integer('lead_score')->default(0)->index();
            $table->timestamp('last_activity_at')->nullable()->index();

            // Cached/computed fields for performance (updated via observers/jobs)
            $table->timestamp('next_follow_up_at')->nullable()->index(); // Computed from activities
            $table->integer('pending_activities_count')->default(0); // Cache for quick filtering

            // Soft deletes and timestamps
            $table->timestamps();
            $table->softDeletes();

            // Composite indexes
            $table->index(['name', 'email', 'detail']); // Composite text search
            $table->index(['inquiry_status', 'created_at']);
            $table->index(['lead_score', 'last_activity_at']);
        });

        // Add check constraints using raw SQL statements
        DB::statement('ALTER TABLE leads ADD CONSTRAINT lead_score_range CHECK (lead_score >= 0 AND lead_score <= 100)');
        DB::statement('ALTER TABLE leads ADD CONSTRAINT valid_latitude CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90))');
        DB::statement('ALTER TABLE leads ADD CONSTRAINT valid_longitude CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))');

        // Create additional indexes for performance (removed CONCURRENTLY)
        DB::statement('CREATE INDEX leads_full_text_search ON leads USING gin(to_tsvector(\'english\', coalesce(name,\'\') || \' \' || coalesce(email,\'\') || \' \' || coalesce(phone,\'\') || \' \' || coalesce(detail,\'\')))');
        // Partial indexes for active leads
        DB::statement('CREATE INDEX leads_active_idx ON leads (created_at, inquiry_status) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX leads_hot_idx ON leads (lead_score, last_activity_at) WHERE deleted_at IS NULL AND inquiry_status IN (\'new\', \'contacted\', \'qualified\')');

        // Create PostGIS spatial index for geographic queries
        DB::statement('CREATE INDEX leads_spatial_idx ON leads USING gist(ST_Point(longitude, latitude)) WHERE longitude IS NOT NULL AND latitude IS NOT NULL');

        // Create trigger for updating updated_at (reuse existing function)
        DB::statement('
            CREATE TRIGGER update_leads_updated_at
                BEFORE UPDATE ON leads
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        ');
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
