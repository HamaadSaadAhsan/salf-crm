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
        Schema::create('social_comments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('provider');
            $table->string('provider_id');
            $table->string('post_id');
            $table->text('content');
            $table->string('author_id');
            $table->string('author_name')->nullable();
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
        Schema::dropIfExists('social_comments');
    }
};
