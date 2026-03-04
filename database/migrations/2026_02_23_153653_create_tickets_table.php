<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assigned_to_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type');
            $table->string('status')->default('open');
            $table->string('priority')->default('medium');
            $table->string('subject');
            $table->text('description');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'status']);
            $table->index(['assigned_to_id', 'status']);
            $table->index('status');
            $table->index('priority');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
