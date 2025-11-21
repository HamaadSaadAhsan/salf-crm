<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Simplify call_sessions table by removing SIP-related fields.
     * The PBX/SIP (Linphone) handles actual call mechanics.
     * CRM only needs to track calls via WebSocket events.
     */
    public function up(): void
    {
        Schema::table('call_sessions', function (Blueprint $table) {
            // Drop foreign key constraints first
            $table->dropForeign(['callee_id']);
            $table->dropForeign(['caller_sip_account_id']);
            $table->dropForeign(['callee_sip_account_id']);

            // Drop indexes
            $table->dropIndex(['callee_id', 'status']);

            // Drop SIP-related columns - we don't need them
            // The PBX handles SIP, we just track via WebSocket
            $table->dropColumn([
                'callee_id',              // Not needed - leads aren't users
                'caller_sip_account_id',  // SIP handled by PBX
                'callee_sip_account_id',  // SIP handled by PBX
                'sip_data',               // SIP data stays in PBX
                'media_data',             // Media data stays in PBX
                'asterisk_channel_id',    // Internal Asterisk detail
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('call_sessions', function (Blueprint $table) {
            // Add back the columns
            $table->unsignedBigInteger('callee_id')->nullable()->after('caller_id');
            $table->unsignedBigInteger('caller_sip_account_id')->nullable()->after('lead_id');
            $table->unsignedBigInteger('callee_sip_account_id')->nullable()->after('caller_sip_account_id');
            $table->json('sip_data')->nullable()->after('end_reason');
            $table->json('media_data')->nullable()->after('sip_data');
            $table->string('asterisk_channel_id')->nullable()->after('media_data');

            // Add back indexes
            $table->index(['callee_id', 'status']);

            // Add back foreign keys
            $table->foreign('callee_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('caller_sip_account_id')->references('id')->on('sip_accounts')->onDelete('set null');
            $table->foreign('callee_sip_account_id')->references('id')->on('sip_accounts')->onDelete('set null');
        });
    }
};
