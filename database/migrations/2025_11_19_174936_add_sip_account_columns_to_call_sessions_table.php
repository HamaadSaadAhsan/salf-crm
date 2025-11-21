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
        Schema::table('call_sessions', function (Blueprint $table) {
            $table->foreignId('caller_sip_account_id')->nullable()->after('caller_id')->constrained('sip_accounts')->nullOnDelete();
            $table->foreignId('callee_sip_account_id')->nullable()->after('lead_id')->constrained('sip_accounts')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('call_sessions', function (Blueprint $table) {
            $table->dropForeign(['caller_sip_account_id']);
            $table->dropForeign(['callee_sip_account_id']);
            $table->dropColumn(['caller_sip_account_id', 'callee_sip_account_id']);
        });
    }
};
