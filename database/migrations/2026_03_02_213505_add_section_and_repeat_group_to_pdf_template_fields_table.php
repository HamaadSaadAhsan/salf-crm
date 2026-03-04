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
        Schema::table('pdf_template_fields', function (Blueprint $table) {
            $table->string('section')->nullable()->after('page_number');
            $table->string('repeat_group')->nullable()->after('section');
        });
    }

    public function down(): void
    {
        Schema::table('pdf_template_fields', function (Blueprint $table) {
            $table->dropColumn(['section', 'repeat_group']);
        });
    }
};
