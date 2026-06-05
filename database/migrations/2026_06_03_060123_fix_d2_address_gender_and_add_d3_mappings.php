<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Fix D2 address: was line_1/line_2, should be full_address/city
        DB::table('field_mappings')
            ->where('form_template_id', 2)
            ->where('field_name', 'Address_1')
            ->update(['canonical_path' => 'main_applicant.address_residential.full_address']);

        DB::table('field_mappings')
            ->where('form_template_id', 2)
            ->where('field_name', 'Addres_2')
            ->update(['canonical_path' => 'main_applicant.address_residential.city']);

        // Fix D2 gender checkboxes: use derived boolean paths with truthy matching
        DB::table('field_mappings')
            ->where('form_template_id', 2)
            ->where('field_name', 'Check Box1')
            ->update([
                'canonical_path' => 'main_applicant.gender_is_male',
                'value_for_truthy' => 'Yes',
            ]);

        DB::table('field_mappings')
            ->where('form_template_id', 2)
            ->where('field_name', 'Check Box2')
            ->update([
                'canonical_path' => 'main_applicant.gender_is_female',
                'value_for_truthy' => 'Yes',
            ]);

        // Add D3 field mappings (text fields for main applicant data)
        $d3Id = 3;
        $now = now();

        $mappings = [
            ['field_name' => 'Full Name',                 'canonical_path' => 'main_applicant.full_name',                              'value_for_truthy' => null],
            ['field_name' => 'Residential Address',       'canonical_path' => 'main_applicant.address_residential.full_address',       'value_for_truthy' => null],
            ['field_name' => 'Country of Residence',      'canonical_path' => 'main_applicant.address_residential.country',            'value_for_truthy' => null],
            ['field_name' => 'Date of Birth',             'canonical_path' => 'main_applicant.dob',                                    'value_for_truthy' => null],
            ['field_name' => 'Passport Number / National ID', 'canonical_path' => 'main_applicant.passport_1.number',                  'value_for_truthy' => null],
            ['field_name' => 'Date and place of issue',   'canonical_path' => 'main_applicant.passport_1.date_of_issue',               'value_for_truthy' => null],
            ['field_name' => 'Occupation',                'canonical_path' => 'main_applicant.current_occupation',                     'value_for_truthy' => null],
            ['field_name' => 'Maritial Status',           'canonical_path' => 'main_applicant.marital_status',                         'value_for_truthy' => null],
            ['field_name' => 'Email Address',             'canonical_path' => 'main_applicant.email',                                  'value_for_truthy' => null],
            ['field_name' => 'Check Box5',                'canonical_path' => 'main_applicant.gender_is_male',                         'value_for_truthy' => 'Yes'],
            ['field_name' => 'Check Box6',                'canonical_path' => 'main_applicant.gender_is_female',                       'value_for_truthy' => 'Yes'],
        ];

        if (DB::table('form_templates')->where('id', $d3Id)->exists()) {
            foreach ($mappings as $row) {
                DB::table('field_mappings')->upsert(
                    array_merge($row, ['form_template_id' => $d3Id, 'created_at' => $now, 'updated_at' => $now]),
                    ['form_template_id', 'field_name'],
                    ['canonical_path', 'value_for_truthy', 'updated_at'],
                );
            }
        }
    }

    public function down(): void
    {
        // Revert D2 address
        DB::table('field_mappings')
            ->where('form_template_id', 2)
            ->where('field_name', 'Address_1')
            ->update(['canonical_path' => 'main_applicant.address_residential.line_1']);

        DB::table('field_mappings')
            ->where('form_template_id', 2)
            ->where('field_name', 'Addres_2')
            ->update(['canonical_path' => 'main_applicant.address_residential.line_2']);

        // Revert D2 gender
        DB::table('field_mappings')
            ->where('form_template_id', 2)
            ->where('field_name', 'Check Box1')
            ->update(['canonical_path' => 'main_applicant.gender.male', 'value_for_truthy' => null]);

        DB::table('field_mappings')
            ->where('form_template_id', 2)
            ->where('field_name', 'Check Box2')
            ->update(['canonical_path' => 'main_applicant.gender.female', 'value_for_truthy' => null]);

        // Remove D3 mappings
        DB::table('field_mappings')
            ->where('form_template_id', 3)
            ->whereIn('field_name', [
                'Full Name', 'Residential Address', 'Country of Residence',
                'Date of Birth', 'Passport Number / National ID', 'Date and place of issue',
                'Occupation', 'Maritial Status', 'Email Address', 'Check Box5', 'Check Box6',
            ])
            ->delete();
    }
};
