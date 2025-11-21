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
        Schema::create('call_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('call_session_id')->constrained()->cascadeOnDelete();
            $table->string('log_level'); // debug, info, warning, error
            $table->string('event_type'); // sip_invite, sip_ringing, sip_answer, sip_bye, media_start, media_end, error
            $table->text('message');
            $table->json('context')->nullable(); // Additional context data
            $table->string('source')->nullable(); // asterisk, pjsip, application
            $table->timestamp('logged_at');
            $table->timestamps();

            $table->index(['call_session_id', 'event_type']);
            $table->index('logged_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('call_logs');
    }
};
