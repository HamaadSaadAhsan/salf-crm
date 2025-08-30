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
            $table->string('form_external_id')->nullable();
            $table->string('ad_external_id')->nullable();
            $table->string('lead_form_id')->nullable();

            $table->foreign('ad_external_id')->references('external_id')->on('ads');
            $table->foreign('lead_form_id')->references('id')->on('lead_forms');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            //
        });
    }
};
