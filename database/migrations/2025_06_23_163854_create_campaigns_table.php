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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id');
            $table->string('external_id')->unique();
            $table->string('name');
            $table->string('objective')->nullable();
            $table->string('status');
            $table->timestamp('created_at');
            $table->timestamp('last_synced');

            $table->unique(['user_id', 'external_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
