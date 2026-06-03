<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // D1 field A6 is a radio group whose two child widgets export "Yes" (Male)
        // and "No" (Female). The filler's text-path branch compares the resolved
        // value against each widget's on-state, so we must supply "Yes" or "No"
        // rather than "Male"/"Female". canonicalData() now derives gender_yes_no.
        DB::table('field_mappings')
            ->where('form_template_id', 1)
            ->where('field_name', 'A6')
            ->update(['canonical_path' => 'main_applicant.gender_yes_no', 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('field_mappings')
            ->where('form_template_id', 1)
            ->where('field_name', 'A6')
            ->update(['canonical_path' => 'main_applicant.gender', 'updated_at' => now()]);
    }
};
