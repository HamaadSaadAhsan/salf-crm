<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lead_pdf_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('lead_id')->constrained('leads')->cascadeOnDelete();
            $table->foreignId('pdf_template_id')->constrained('pdf_templates');
            $table->json('field_values')->default('{}');
            $table->string('status')->default('draft');
            $table->foreignId('submitted_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lead_pdf_submissions');
    }
};
