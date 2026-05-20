<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('field_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_template_id')->constrained()->cascadeOnDelete();
            $table->string('field_name');
            $table->string('canonical_path');
            $table->string('value_for_truthy')->nullable();
            $table->string('transform')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['form_template_id', 'field_name']);
            $table->index('canonical_path');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('field_mappings');
    }
};
