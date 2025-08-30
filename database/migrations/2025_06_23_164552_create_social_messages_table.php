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
        Schema::create('social_messages', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('provider');
            $table->string('provider_id');
            $table->text('message');
            $table->json('metadata')->nullable();
            $table->timestamp('timestamp');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('social_messages');
    }
};
