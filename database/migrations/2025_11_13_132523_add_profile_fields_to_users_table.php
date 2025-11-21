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
            $table->string('phone', 20)->nullable()->after('email');
            $table->string('company')->nullable()->after('phone');
            $table->date('birth_date')->nullable()->after('company');
            $table->string('avatar')->nullable()->after('birth_date');
            $table->boolean('availability')->default(false)->after('avatar');
            $table->string('visibility')->default('public')->after('availability');
            $table->date('availability_date')->nullable()->after('visibility');
            $table->time('availability_time')->nullable()->after('availability_date');
            $table->time('dismissal_time')->nullable()->after('availability_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone',
                'company',
                'birth_date',
                'avatar',
                'availability',
                'visibility',
                'availability_date',
                'availability_time',
                'dismissal_time',
            ]);
        });
    }
};
