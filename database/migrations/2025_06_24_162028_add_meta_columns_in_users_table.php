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
        Schema::table('users', function (Blueprint $table) {
            $table->text('facebook_user_access_token')->nullable()->after('remember_token');
            $table->timestamp('facebook_token_expires_at')->nullable()->after('facebook_user_access_token');
            $table->text('facebook_refresh_token')->nullable()->after('facebook_token_expires_at');
            $table->timestamp('facebook_connected_at')->nullable()->after('facebook_refresh_token');

            // Index for token expiry queries
            $table->index('facebook_token_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['facebook_token_expires_at']);
            $table->dropColumn([
                'facebook_user_access_token',
                'facebook_token_expires_at',
                'facebook_refresh_token',
                'facebook_connected_at'
            ]);
        });
    }
};
