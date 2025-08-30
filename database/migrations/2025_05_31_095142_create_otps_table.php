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
        Schema::create('otps', function (Blueprint $table) {
            $table->id();
            $table->string('identifier'); // email or phone
            $table->string('token', 6);
            $table->enum('type', ['email_verification', 'phone_verification', 'password_reset', 'login_verification']);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->integer('attempts')->default(0);
            $table->boolean('used')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['identifier', 'type']);
            $table->index(['token', 'type']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otps');
    }
};
