<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds a monotonic numeric `seq` column used as a stable keyset/cursor key.
     * The UUID primary key cannot be range-filtered in Meilisearch, so a numeric
     * sequence gives both Postgres and the search index a unique, sortable cursor.
     */
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->unsignedBigInteger('seq')->nullable()->after('id');
        });

        // Backfill existing rows in creation order so seq DESC matches "newest first".
        DB::statement(<<<'SQL'
            WITH ordered AS (
                SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
                FROM leads
            )
            UPDATE leads SET seq = ordered.rn
            FROM ordered
            WHERE leads.id = ordered.id
        SQL);

        // Dedicated sequence drives new inserts via a column default.
        DB::statement('CREATE SEQUENCE IF NOT EXISTS leads_seq_seq OWNED BY leads.seq');
        DB::statement("SELECT setval('leads_seq_seq', COALESCE((SELECT MAX(seq) FROM leads), 0) + 1, false)");
        DB::statement("ALTER TABLE leads ALTER COLUMN seq SET DEFAULT nextval('leads_seq_seq')");
        DB::statement('ALTER TABLE leads ALTER COLUMN seq SET NOT NULL');

        Schema::table('leads', function (Blueprint $table) {
            $table->unique('seq');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropUnique(['seq']);
            $table->dropColumn('seq');
        });

        DB::statement('DROP SEQUENCE IF EXISTS leads_seq_seq');
    }
};
