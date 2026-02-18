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
        Schema::create('call_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();
            $table->foreignId('caller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('callee_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('call_direction'); // inbound, outbound
            $table->string('call_type')->default('voice'); // voice, video
            $table->string('status'); // initiated, ringing, answered, ended, failed, busy, cancelled
            $table->string('caller_number')->nullable();
            $table->string('callee_number')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('answered_at')->nullable();
            $table->timestamp('ended_at')->nullable();
            $table->integer('duration')->nullable(); // in seconds
            $table->string('end_reason')->nullable(); // hangup, busy, cancel, failed, etc.
            $table->json('sip_data')->nullable(); // SIP protocol specific data
            $table->json('media_data')->nullable(); // Audio/video codec info
            $table->string('asterisk_channel_id')->nullable();
            $table->string('recording_path')->nullable();
            $table->timestamps();

            $table->index(['caller_id', 'status']);
            $table->index(['callee_id', 'status']);
            $table->index('session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('call_sessions');
    }
};
