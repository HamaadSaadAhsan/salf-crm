<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('template_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('form_template_id')->constrained()->cascadeOnDelete();
            $table->string('field_name');
            $table->enum('field_type', ['text', 'checkbox', 'radio', 'signature', 'unknown']);
            $table->unsignedSmallInteger('page')->nullable();
            $table->jsonb('rect_pdf')->nullable();
            $table->jsonb('page_size_pdf')->nullable();
            $table->jsonb('export_values')->nullable();
            $table->timestamps();

            $table->unique(['form_template_id', 'field_name']);
            $table->index(['form_template_id', 'page']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('template_fields');
    }
};
