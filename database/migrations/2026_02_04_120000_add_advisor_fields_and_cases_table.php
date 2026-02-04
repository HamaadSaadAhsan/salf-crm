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
            // Advisor-specific lifecycle stage
            $table->string('advisor_stage')
                ->nullable()
                ->after('requalify_reason');

            // Track which advisor sent the lead back for requalification
            $table->unsignedBigInteger('requalified_from_advisor_id')
                ->nullable()
                ->after('qualified_by');

            $table->foreign('requalified_from_advisor_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            // First time a CRO viewed the lead
            $table->timestamp('viewed_at')
                ->nullable()
                ->after('last_activity_at');
        });

        Schema::create('lead_cases', function (Blueprint $table) {
            $table->id();

            $table->uuid('lead_id');
            $table->unsignedBigInteger('advisor_id')->nullable();

            // Post-approval lifecycle fields
            $table->timestamp('initial_payment_at')->nullable();
            $table->decimal('initial_payment_amount', 12, 2)->nullable();

            $table->timestamp('documents_compiled_at')->nullable();
            $table->timestamp('govt_fee_paid_at')->nullable();

            $table->enum('due_diligence_status', ['pending', 'in_progress', 'approved', 'denied'])
                ->default('pending');

            $table->enum('result', ['approved', 'denied'])->nullable();

            $table->timestamp('post_approval_payment_at')->nullable();
            $table->timestamp('passport_delivered_at')->nullable();

            $table->timestamps();

            $table->foreign('lead_id')
                ->references('id')
                ->on('leads')
                ->onDelete('cascade');

            $table->foreign('advisor_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropForeign(['requalified_from_advisor_id']);

            $table->dropColumn([
                'advisor_stage',
                'requalified_from_advisor_id',
                'viewed_at',
            ]);
        });

        Schema::dropIfExists('lead_cases');
    }
};

