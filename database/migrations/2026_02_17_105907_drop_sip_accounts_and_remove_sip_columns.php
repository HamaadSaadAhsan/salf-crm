<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('call_sessions', function (Blueprint $table) {
            if (Schema::hasColumn('call_sessions', 'caller_sip_account_id')) {
                $table->dropForeign(['caller_sip_account_id']);
                $table->dropColumn('caller_sip_account_id');
            }
            if (Schema::hasColumn('call_sessions', 'callee_sip_account_id')) {
                $table->dropForeign(['callee_sip_account_id']);
                $table->dropColumn('callee_sip_account_id');
            }
        });

        Schema::table('call_participants', function (Blueprint $table) {
            if (Schema::hasColumn('call_participants', 'sip_account_id')) {
                $table->dropForeign(['sip_account_id']);
                $table->dropColumn('sip_account_id');
            }
        });

        Schema::dropIfExists('sip_accounts');
    }

    public function down(): void
    {
        Schema::create('sip_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('username');
            $table->string('password');
            $table->string('domain');
            $table->integer('port')->default(5060);
            $table->string('transport')->default('UDP');
            $table->string('codec_priority')->nullable();
            $table->string('status')->default('unregistered');
            $table->boolean('is_enabled')->default(true);
            $table->timestamps();
        });

        Schema::table('call_sessions', function (Blueprint $table) {
            $table->foreignId('caller_sip_account_id')->nullable()->constrained('sip_accounts')->nullOnDelete();
            $table->foreignId('callee_sip_account_id')->nullable()->constrained('sip_accounts')->nullOnDelete();
        });

        Schema::table('call_participants', function (Blueprint $table) {
            $table->foreignId('sip_account_id')->nullable()->constrained()->nullOnDelete();
        });
    }
};
