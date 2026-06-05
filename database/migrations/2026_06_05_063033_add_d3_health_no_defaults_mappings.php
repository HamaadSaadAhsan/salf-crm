<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Map every D3 "No" checkbox to main_applicant.health_all_no (derived as "Yes"
     * in canonicalData()). This ensures all health questionnaire "No" options are
     * selected by default on every generated D3 form.
     */
    public function up(): void
    {
        $now = now();
        $noBoxes = [
            // Page 1: Q1 health problems, Q2 hospitalised, Q3 visited doctor
            'Check Box16', 'Check Box20', 'Check Box22',
            // Page 2 left col: diseases a–k
            'Check Box27', 'Check Box29', 'Check Box31', 'Check Box33', 'Check Box35',
            'Check Box37', 'Check Box40', 'Check Box42', 'Check Box44', 'Check Box46', 'Check Box48',
            // Page 2 right col: diseases l onward
            'Check Box50', 'Check Box52', 'Check Box54', 'Check Box56', 'Check Box58',
            'Check Box60', 'Check Box62', 'Check Box64', 'Check Box66', 'Check Box68', 'Check Box70',
            // Page 2 body-system abnormalities: Skin, Respiratory, Cardiovascular, Digestive
            'Check Box73', 'Check Box75', 'Check Box77', 'Check Box79',
            // Page 3 body-system abnormalities: Nervous, Urogenital, Musculoskeletal, Endocrine
            'Check Box87', 'Check Box89', 'Check Box91', 'Check Box93',
        ];

        $rows = array_map(fn (string $box) => [
            'form_template_id' => 3,
            'field_name' => $box,
            'canonical_path' => 'main_applicant.health_all_no',
            'value_for_truthy' => 'Yes',
            'created_at' => $now,
            'updated_at' => $now,
        ], $noBoxes);

        DB::table('field_mappings')->insert($rows);
    }

    public function down(): void
    {
        DB::table('field_mappings')
            ->where('form_template_id', 3)
            ->where('canonical_path', 'main_applicant.health_all_no')
            ->delete();
    }
};
