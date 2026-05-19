<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables that need a nullable `team_id` foreign key for multi-team data isolation.
     *
     * @var array<int, string>
     */
    private array $tables = [
        'call_sessions',
        'workflows',
        'tickets',
        'messages',
        'meta_pages',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('team_id')->nullable()->constrained()->nullOnDelete()->after('id');
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('team_id');
            });
        }
    }
};
