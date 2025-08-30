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
        Schema::create('workflow_field_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workflow_step_id')->constrained()->onDelete('cascade');
            $table->string('source_field'); // e.g., 'name', 'phone', 'budget'
            $table->string('target_field'); // mapped field name
            $table->string('field_type')->default('text'); // text, number, email, etc.
            $table->json('transformation_rules')->nullable(); // Any data transformation rules
            $table->boolean('required')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_field_mappings');
    }
};
