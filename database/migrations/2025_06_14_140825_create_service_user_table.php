<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('service_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('service_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('assigned_at')->nullable();
            $table->string('status')->default('active');
            $table->text('notes')->nullable();

            // PostgreSQL specific: JSONB for flexible metadata storage
            $table->jsonb('metadata')->nullable()->comment('Flexible storage for assignment-specific data');

            $table->timestamps();

            // Unique constraint
            $table->unique(['service_id', 'user_id']);

            // Regular indexes
            $table->index(['service_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index('assigned_at');

            // PostgreSQL specific: Partial indexes for active assignments only
            $table->index(['service_id'], 'service_user_service_id_active_idx');
            $table->index(['user_id'], 'service_user_user_id_active_idx');
        });

        // PostgreSQL specific enhancements
        DB::unprepared("
            -- Add check constraint for status values
            ALTER TABLE service_user
            ADD CONSTRAINT service_user_status_check
            CHECK (status IN ('active', 'inactive', 'pending'));

            -- Create partial indexes for active assignments
            DROP INDEX IF EXISTS service_user_service_id_active_idx;
            DROP INDEX IF EXISTS service_user_user_id_active_idx;

            CREATE INDEX service_user_service_id_active_idx
            ON service_user (service_id)
            WHERE status = 'active';

            CREATE INDEX service_user_user_id_active_idx
            ON service_user (user_id)
            WHERE status = 'active';

            -- GIN index for JSONB metadata queries
            CREATE INDEX service_user_metadata_gin_idx
            ON service_user USING GIN (metadata);

            -- Composite index for common queries
            CREATE INDEX service_user_active_assignments_idx
            ON service_user (user_id, service_id, assigned_at)
            WHERE status = 'active';
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop custom indexes first
        DB::unprepared("
            DROP INDEX IF EXISTS service_user_service_id_active_idx;
            DROP INDEX IF EXISTS service_user_user_id_active_idx;
            DROP INDEX IF EXISTS service_user_metadata_gin_idx;
            DROP INDEX IF EXISTS service_user_active_assignments_idx;
        ");

        Schema::dropIfExists('service_user');
    }
};
