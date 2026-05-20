<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained();
            $table->string('application_code')->unique();
            $table->string('main_applicant_name')->nullable();
            $table->string('main_applicant_passport')->nullable();
            $table->enum('status', ['draft', 'in_progress', 'submitted', 'approved', 'rejected', 'archived'])->default('draft');
            $table->jsonb('data');
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('assigned_to_user_id')->nullable()->constrained('users');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['program_id', 'status']);
            $table->index(['assigned_to_user_id', 'status']);
            $table->index('main_applicant_name');
            $table->index('main_applicant_passport');
        });

        DB::statement('CREATE INDEX applications_data_gin ON applications USING GIN (data jsonb_path_ops)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS applications_data_gin');
        Schema::dropIfExists('applications');
    }
};
