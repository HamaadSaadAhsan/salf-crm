<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pdf_template_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pdf_template_id')->constrained('pdf_templates')->cascadeOnDelete();
            $table->string('field_name');
            $table->string('field_label');
            $table->string('field_type')->default('text');
            $table->json('field_options')->nullable();
            $table->string('lead_field_mapping')->nullable();
            $table->string('default_value')->nullable();
            $table->integer('sort_order')->default(0);
            $table->integer('page_number')->nullable();
            $table->boolean('is_required')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pdf_template_fields');
    }
};
