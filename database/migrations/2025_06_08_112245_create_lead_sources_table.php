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
        DB::statement("DO $$ BEGIN CREATE TYPE lead_source_status AS ENUM ('active', 'inactive'); EXCEPTION WHEN duplicate_object THEN null; END $$;");

        Schema::create('lead_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique();
            $table->string('slug', 120)->unique();
            $table->string('identifier', 50)->unique()->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestampsTz();

            // Indexes
            $table->index('name');
            $table->index('slug');
            $table->index('identifier');
        });

        // Add check constraints
        DB::statement('ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_name_length CHECK (LENGTH(TRIM(name)) >= 2)');
        DB::statement('ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_slug_length CHECK (LENGTH(TRIM(slug)) >= 2)');
        DB::statement('ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_identifier_length CHECK (identifier IS NULL OR LENGTH(TRIM(identifier)) >= 2)');

        // Create GIN index for search
        DB::statement('CREATE INDEX idx_lead_sources_name_search ON lead_sources USING gin(to_tsvector(\'english\', name))');
        DB::statement('CREATE INDEX idx_lead_sources_status ON lead_sources(status)');

        // Create or reuse the update trigger function
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
            CREATE TRIGGER update_lead_sources_updated_at
                BEFORE UPDATE ON lead_sources
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        ');

        // Create view
        DB::statement('
            CREATE VIEW active_lead_sources AS
            SELECT
                id,
                name,
                slug,
                identifier,
                created_at,
                updated_at
            FROM lead_sources
            WHERE status = \'active\'
            ORDER BY name
        ');

        // Insert sample data with slugs and identifiers
        DB::table('lead_sources')->insert([
            ['name' => 'Website Contact Form', 'slug' => 'website-contact-form', 'identifier' => 'WEB_FORM', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Facebook Ads', 'slug' => 'facebook-ads', 'identifier' => 'FB_ADS', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Google Ads', 'slug' => 'google-ads', 'identifier' => 'GOOGLE_ADS', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Email Campaign', 'slug' => 'email-campaign', 'identifier' => 'EMAIL_CAMP', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Referral', 'slug' => 'referral', 'identifier' => 'REFERRAL', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Cold Call', 'slug' => 'cold-call', 'identifier' => 'COLD_CALL', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Trade Show', 'slug' => 'trade-show', 'identifier' => 'TRADE_SHOW', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'LinkedIn', 'slug' => 'linkedin', 'identifier' => 'LINKEDIN', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Organic Search', 'slug' => 'organic-search', 'identifier' => 'ORGANIC', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Direct Mail', 'slug' => 'direct-mail', 'identifier' => 'DIRECT_MAIL', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down()
    {
        // Drop view
        DB::statement('DROP VIEW IF EXISTS active_lead_sources');

        // Drop functions (only if not used by other tables)
        // DB::statement('DROP FUNCTION IF EXISTS update_updated_at_column()');

        // Drop table
        Schema::dropIfExists('lead_sources');

        // Drop ENUM type
        DB::statement('DROP TYPE IF EXISTS lead_source_status');
    }
};
