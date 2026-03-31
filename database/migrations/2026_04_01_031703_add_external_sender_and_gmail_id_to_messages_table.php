<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->foreignId('sender_id')->nullable()->change();
            $table->string('external_sender_name')->nullable()->after('sender_id');
            $table->string('external_sender_email')->nullable()->after('external_sender_name');
            $table->string('gmail_message_id')->nullable()->unique()->after('external_sender_email');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['external_sender_name', 'external_sender_email', 'gmail_message_id']);
            $table->foreignId('sender_id')->nullable(false)->change();
        });
    }
};
