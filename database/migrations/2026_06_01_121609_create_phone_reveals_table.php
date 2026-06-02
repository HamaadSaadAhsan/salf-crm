<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('phone_reveals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('lead_id')->constrained()->cascadeOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('revealed_at');
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['lead_id', 'revealed_at']);
            $table->index(['user_id', 'revealed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('phone_reveals');
    }
};
