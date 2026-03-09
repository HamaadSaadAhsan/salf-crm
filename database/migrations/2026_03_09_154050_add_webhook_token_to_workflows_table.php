<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('workflows', function (Blueprint $table) {
            $table->string('webhook_token', 64)->nullable()->unique()->after('metadata');
            $table->json('canvas_data')->nullable()->after('webhook_token');
        });
    }

    public function down(): void
    {
        Schema::table('workflows', function (Blueprint $table) {
            $table->dropColumn(['webhook_token', 'canvas_data']);
        });
    }
};
