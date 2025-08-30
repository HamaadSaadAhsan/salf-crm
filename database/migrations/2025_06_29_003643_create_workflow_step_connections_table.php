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
        Schema::create('workflow_step_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('from_step_id')->constrained('workflow_steps')->onDelete('cascade');
            $table->foreignId('to_step_id')->constrained('workflow_steps')->onDelete('cascade');
            $table->json('conditions')->nullable(); // Store conditional logic if needed
            $table->timestamps();

            $table->unique(['from_step_id', 'to_step_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_step_connections');
    }
};
