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
            $table->integer('current_lead_count')->default(0)->after('active');
            $table->integer('total_leads_assigned')->default(0)->after('current_lead_count');
            $table->integer('qualified_leads_count')->default(0)->after('total_leads_assigned');
            $table->integer('converted_leads_count')->default(0)->after('qualified_leads_count');
            $table->decimal('conversion_rate', 5, 2)->default(0)->after('converted_leads_count');
            $table->decimal('performance_weight', 5, 2)->default(1.0)->after('conversion_rate');
            $table->timestamp('last_assignment_at')->nullable()->after('performance_weight');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->string('loss_reason')->nullable()->after('inquiry_status');
            $table->text('requalify_reason')->nullable()->after('loss_reason');
            $table->bigInteger('qualified_by')->unsigned()->nullable()->after('assigned_to');
            $table->timestamp('qualified_at')->nullable()->after('qualified_by');
            $table->timestamp('converted_at')->nullable()->after('qualified_at');

            $table->foreign('qualified_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'current_lead_count',
                'total_leads_assigned',
                'qualified_leads_count',
                'converted_leads_count',
                'conversion_rate',
                'performance_weight',
                'last_assignment_at',
            ]);
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['qualified_by']);
            $table->dropColumn([
                'loss_reason',
                'requalify_reason',
                'qualified_by',
                'qualified_at',
                'converted_at',
            ]);
        });
    }
};
