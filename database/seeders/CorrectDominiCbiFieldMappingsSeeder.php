<?php

namespace Database\Seeders;

use App\Data\Forms\SuggestedMappingDictionary;
use App\Models\Forms\FormTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CorrectDominiCbiFieldMappingsSeeder extends Seeder
{
    public function run(): void
    {
        $templateCodes = [
            'form_d1',
            'form_d2',
            'form_d3',
            'form_d4',
            'affidavit_sd',
            'e_passport_application',
        ];

        foreach ($templateCodes as $code) {
            $template = FormTemplate::where('code', $code)->first();

            if (! $template) {
                $this->command->warn("Template [{$code}] not found — skipping.");

                continue;
            }

            $mappings = SuggestedMappingDictionary::forTemplate($code);

            if (empty($mappings)) {
                $this->command->warn("No suggested mappings for [{$code}] — skipping.");

                continue;
            }

            DB::table('field_mappings')
                ->where('form_template_id', $template->id)
                ->delete();

            $now = now();
            $rows = [];

            foreach ($mappings as $fieldName => $canonicalPath) {
                $rows[] = [
                    'form_template_id' => $template->id,
                    'field_name' => $fieldName,
                    'canonical_path' => $canonicalPath,
                    'value_for_truthy' => null,
                    'transform' => null,
                    'notes' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            DB::table('field_mappings')->insert($rows);

            $this->command->info("[{$code}] — deleted old, inserted ".count($rows).' mappings.');
        }
    }
}
