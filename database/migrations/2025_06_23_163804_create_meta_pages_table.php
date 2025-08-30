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
        Schema::create('meta_pages', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->bigInteger('user_id');
            $table->string('page_id')->unique();
            $table->string('name');
            $table->text('access_token');
            $table->timestamp('last_updated');

            $table->foreign('user_id')->references('id')->on('users');
            $table->unique(['user_id', 'page_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meta_pages');
    }
};
