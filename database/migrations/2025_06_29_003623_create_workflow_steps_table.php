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
        Schema::create('workflow_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_id')->constrained()->onDelete('cascade');
            $table->string('step_type'); // 'trigger', 'action'
            $table->string('service'); // 'facebook_lead_ads', 'webhook', 'email', etc.
            $table->string('operation'); // 'new_lead', 'post_webhook', 'send_email'
            $table->integer('order')->default(0);
            $table->json('configuration'); // Store step-specific config
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->index(['workflow_id', 'order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_steps');
    }
};
