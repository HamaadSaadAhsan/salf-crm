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
        Schema::create('ad_sets', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id');
            $table->string('external_id')->unique();
            $table->string('name');
            $table->string('campaign_external_id');
            $table->string('status');
            $table->timestamp('created_at');
            $table->timestamp('last_synced');

            $table->foreign('campaign_external_id')->references('external_id')->on('campaigns');
            $table->unique(['user_id', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ad_sets');
    }
};
