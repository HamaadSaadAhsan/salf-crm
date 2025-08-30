<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_activities', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // Activity details
            $table->enum('type', [
                'call', 'email', 'meeting', 'note', 'message', 'task',
                'follow_up', 'status_change', 'assignment_change'
            ])->index();

            $table->enum('status', ['pending', 'completed', 'cancelled', 'overdue'])
                ->default('pending')
                ->index();

            $table->string('subject');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable(); // Flexible data storage

            // Scheduling
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('due_at')->nullable()->index();

            // Priority and categorization
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])
                ->default('medium')
                ->index();

            $table->string('category')->nullable()->index(); // sales, support, marketing

            // Duration tracking
            $table->integer('duration_minutes')->nullable();
            $table->decimal('cost', 8, 2)->nullable(); // Track activity costs

            // Results and outcomes
            $table->enum('outcome', [
                'successful', 'no_answer', 'busy', 'not_interested',
                'callback_requested', 'information_sent', 'meeting_scheduled'
            ])->nullable()->index();

            $table->text('notes')->nullable();
            $table->json('attachments')->nullable(); // File references

            // Integration fields
            $table->string('external_id')->nullable()->unique();
            $table->string('source_system')->nullable(); // calendar, crm, etc.

            $table->timestamps();
            $table->softDeletes();

            // Basic indexes for performance
            $table->index(['lead_id', 'type', 'status']);
            $table->index(['user_id', 'scheduled_at']);
            $table->index(['due_at', 'status']); // For overdue queries
            $table->index(['created_at', 'type']); // For activity feeds
        });

        // Additional specialized indexes (removed CONCURRENTLY and mutable functions)
        DB::statement('CREATE INDEX activities_pending_idx ON lead_activities (scheduled_at, priority) WHERE status = \'pending\' AND deleted_at IS NULL');
        DB::statement('CREATE INDEX activities_due_date_idx ON lead_activities (due_at, user_id, status) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX activities_scheduled_date_idx ON lead_activities (scheduled_at, user_id, type) WHERE deleted_at IS NULL');

        // Add check constraints
        DB::statement('ALTER TABLE lead_activities ADD CONSTRAINT activity_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes >= 0)');
        DB::statement('ALTER TABLE lead_activities ADD CONSTRAINT activity_cost_positive CHECK (cost IS NULL OR cost >= 0)');
        DB::statement('ALTER TABLE lead_activities ADD CONSTRAINT activity_dates_logical CHECK (completed_at IS NULL OR scheduled_at IS NULL OR completed_at >= scheduled_at)');

        // Create trigger for updating updated_at (reuse existing function)
        DB::statement('
            CREATE TRIGGER update_lead_activities_updated_at
                BEFORE UPDATE ON lead_activities
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        ');

        // Create view for active activities
        DB::statement('
            CREATE VIEW active_lead_activities AS
            SELECT
                a.*,
                l.name as lead_name,
                l.email as lead_email,
                u.name as user_name
            FROM lead_activities a
            JOIN leads l ON a.lead_id = l.id
            JOIN users u ON a.user_id = u.id
            WHERE a.deleted_at IS NULL
            ORDER BY a.scheduled_at DESC
        ');
    }

    public function down(): void
    {
        // Drop view
        DB::statement('DROP VIEW IF EXISTS active_lead_activities');

        // Drop table
        Schema::dropIfExists('lead_activities');
    }
};
