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
        Schema::create('lead_service_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('lead_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_service_id')->nullable()->constrained('services')->nullOnDelete();
            $table->boolean('is_parent_service')->default(false);
            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamps();

            $table->index(['user_id', 'service_id']);
            $table->index(['lead_id', 'service_id']);
            $table->index('parent_service_id');
            $table->index('assigned_at');

            $table->unique(['lead_id', 'service_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_service_assignments');
    }
};
