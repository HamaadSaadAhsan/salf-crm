<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained()->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->string('file_path');
            $table->enum('file_type', ['pdf', 'docx']);
            $table->char('file_hash', 64)->nullable();
            $table->enum('mapping_mode', ['name', 'geometry', 'docx_jinja']);
            $table->unsignedSmallInteger('page_count')->nullable();
            $table->unsignedSmallInteger('field_count')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['program_id', 'code']);
            $table->index(['program_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form_templates');
    }
};
