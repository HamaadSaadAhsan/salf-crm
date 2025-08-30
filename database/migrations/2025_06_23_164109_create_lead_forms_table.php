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
        Schema::create('lead_forms', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id');
            $table->string('external_id');
            $table->string('name');
            $table->string('page_id');
            $table->string('status');
            $table->json('questions');
            $table->timestamp('created_at');
            $table->timestamp('last_synced');

            $table->foreign('page_id')->references('page_id')->on('meta_pages');
            $table->unique(['user_id', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_forms');
    }
};
