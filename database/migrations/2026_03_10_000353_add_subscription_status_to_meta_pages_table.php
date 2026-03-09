<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('meta_pages', function (Blueprint $table) {
            $table->timestamp('webhook_subscribed_at')->nullable()->after('last_updated');
            $table->timestamp('app_subscribed_at')->nullable()->after('webhook_subscribed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('meta_pages', function (Blueprint $table) {
            $table->dropColumn(['webhook_subscribed_at', 'app_subscribed_at']);
        });
    }
};
