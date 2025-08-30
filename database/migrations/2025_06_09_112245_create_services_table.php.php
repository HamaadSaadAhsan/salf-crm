<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Create ENUM type first
        DB::statement("DO $$ BEGIN CREATE TYPE service_status AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN null; END $$;");

        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->text('detail')->nullable();
            $table->char('country_code', 2)->nullable();
            $table->string('country_name', 100)->nullable();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->integer('sort_order')->default(0);
            $table->enum('status', ['draft', 'active', 'inactive', 'archived'])
                ->default('active');
            $table->timestampsTz();

            // Indexes
            $table->index(['parent_id']);
            $table->index(['country_code']);
            $table->index(['sort_order']);
            $table->index(['status', 'parent_id', 'sort_order'], 'idx_services_status_parent_sort');

            // Foreign key constraint
            $table->foreign('parent_id')->references('id')->on('services')->onDelete('set null');
        });

        // Add check constraints
        DB::statement('ALTER TABLE services ADD CONSTRAINT services_name_length CHECK (LENGTH(TRIM(name)) >= 2)');
        DB::statement('ALTER TABLE services ADD CONSTRAINT services_no_self_reference CHECK (id != parent_id)');

        // Create GIN index for search
        DB::statement('CREATE INDEX idx_services_name_search ON services USING gin(to_tsvector(\'english\', name))');

        // Create the update trigger function
        DB::statement('
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language \'plpgsql\'
        ');

        // Create the trigger
        DB::statement('
            CREATE TRIGGER update_services_updated_at
                BEFORE UPDATE ON services
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        ');

        // Create hierarchy function
        DB::statement('
            CREATE OR REPLACE FUNCTION get_service_hierarchy(service_id BIGINT)
            RETURNS TABLE(
                id BIGINT,
                name VARCHAR,
                level INTEGER,
                path TEXT
            ) AS $$
            BEGIN
                RETURN QUERY
                WITH RECURSIVE service_tree AS (
                    SELECT
                        s.id,
                        s.name,
                        0 as level,
                        s.name::TEXT as path
                    FROM services s
                    WHERE s.id = service_id

                    UNION ALL

                    SELECT
                        s.id,
                        s.name,
                        st.level + 1,
                        st.path || \' > \' || s.name
                    FROM services s
                    INNER JOIN service_tree st ON s.parent_id = st.id
                    WHERE s.status = \'active\'
                )
                SELECT * FROM service_tree ORDER BY level, service_tree.name;
            END;
            $$ LANGUAGE plpgsql
        ');

        // Create view
        DB::statement('
            CREATE VIEW active_services_with_hierarchy AS
            SELECT
                s.id,
                s.name,
                s.detail,
                s.country_code,
                s.country_name,
                s.parent_id,
                p.name as parent_name,
                s.sort_order,
                s.created_at,
                s.updated_at,
                CASE
                    WHEN s.parent_id IS NULL THEN 0
                    ELSE 1
                END as hierarchy_level
            FROM services s
            LEFT JOIN services p ON s.parent_id = p.id
            WHERE s.status = \'active\'
            ORDER BY s.sort_order, s.name
        ');
    }

    public function down()
    {
        // Drop view
        DB::statement('DROP VIEW IF EXISTS active_services_with_hierarchy');

        // Drop functions
        DB::statement('DROP FUNCTION IF EXISTS get_service_hierarchy(BIGINT)');
        DB::statement('DROP FUNCTION IF EXISTS update_updated_at_column()');

        // Drop table
        Schema::dropIfExists('services');

        // Drop ENUM type
        DB::statement('DROP TYPE IF EXISTS service_status');
    }
};
