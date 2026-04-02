<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('messages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type')->default('to'); // to, cc, bcc
            $table->boolean('is_read')->default(false);
            $table->boolean('is_starred')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamp('trashed_at')->nullable();
            $table->timestamps();

            $table->unique(['message_id', 'user_id', 'type']);
            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'is_starred']);
            $table->index(['user_id', 'trashed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_recipients');
    }
};
