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
        Schema::create('oauth_sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('user_id');
            $table->string('state')->unique();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('expires_at')->default(DB::raw("now() + interval '1 hour'"));
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('oauth_sessions');
    }
};
