<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('field_mappings')
            ->where('field_name', 'A5_1')
            ->where('canonical_path', 'main_applicant.dob')
            ->update(['canonical_path' => 'main_applicant.dob_day']);

        DB::table('field_mappings')
            ->where('field_name', 'A5_2')
            ->where('canonical_path', 'main_applicant.dob')
            ->update(['canonical_path' => 'main_applicant.dob_month']);

        DB::table('field_mappings')
            ->where('field_name', 'A5_3')
            ->where('canonical_path', 'main_applicant.dob')
            ->update(['canonical_path' => 'main_applicant.dob_year']);
    }

    public function down(): void
    {
        DB::table('field_mappings')
            ->where('field_name', 'A5_1')
            ->where('canonical_path', 'main_applicant.dob_day')
            ->update(['canonical_path' => 'main_applicant.dob']);

        DB::table('field_mappings')
            ->where('field_name', 'A5_2')
            ->where('canonical_path', 'main_applicant.dob_month')
            ->update(['canonical_path' => 'main_applicant.dob']);

        DB::table('field_mappings')
            ->where('field_name', 'A5_3')
            ->where('canonical_path', 'main_applicant.dob_year')
            ->update(['canonical_path' => 'main_applicant.dob']);
    }
};
