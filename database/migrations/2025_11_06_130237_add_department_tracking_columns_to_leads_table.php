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
        Schema::table('leads', function (Blueprint $table) {
            $table->timestamp('first_cro_contact_at')->nullable()->after('last_activity_at');
            $table->timestamp('qualification_response_at')->nullable()->after('first_cro_contact_at');
            $table->timestamp('advisor_first_contact_at')->nullable()->after('qualification_response_at');

            $table->index('first_cro_contact_at');
            $table->index('qualification_response_at');
            $table->index('advisor_first_contact_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex(['first_cro_contact_at']);
            $table->dropIndex(['qualification_response_at']);
            $table->dropIndex(['advisor_first_contact_at']);

            $table->dropColumn([
                'first_cro_contact_at',
                'qualification_response_at',
                'advisor_first_contact_at',
            ]);
        });
    }
};
