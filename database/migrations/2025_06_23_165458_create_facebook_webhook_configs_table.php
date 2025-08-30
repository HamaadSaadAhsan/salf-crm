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
        Schema::create('facebook_webhook_configs', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('app_id');
            $table->string('page_id');
            $table->json('subscriptions');
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['app_id', 'page_id']);
            $table->index('app_id');
            $table->index('page_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facebook_webhook_configs');
    }
};
