<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        // D3: "Date and place of issue" should combine date + place into one string.
        // canonicalData() now derives passport_N.date_and_place_of_issue for this purpose.
        DB::table('field_mappings')
            ->where('form_template_id', 3)
            ->where('field_name', 'Date and place of issue')
            ->update(['canonical_path' => 'main_applicant.passport_1.date_and_place_of_issue', 'updated_at' => $now]);

        // D4: "place of issue" was incorrectly mapped to date_of_issue; fix to place_of_issue.
        DB::table('field_mappings')
            ->where('form_template_id', 4)
            ->where('field_name', 'place of issue')
            ->update(['canonical_path' => 'main_applicant.passport_1.place_of_issue', 'updated_at' => $now]);
    }

    public function down(): void
    {
        $now = now();

        DB::table('field_mappings')
            ->where('form_template_id', 3)
            ->where('field_name', 'Date and place of issue')
            ->update(['canonical_path' => 'main_applicant.passport_1.date_of_issue', 'updated_at' => $now]);

        DB::table('field_mappings')
            ->where('form_template_id', 4)
            ->where('field_name', 'place of issue')
            ->update(['canonical_path' => 'main_applicant.passport_1.date_of_issue', 'updated_at' => $now]);
    }
};
