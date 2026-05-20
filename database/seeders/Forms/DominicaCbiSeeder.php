<?php

namespace Database\Seeders\Forms;

use App\Enums\Forms\FileType;
use App\Enums\Forms\MappingMode;
use App\Models\Forms\FormTemplate;
use App\Models\Forms\Program;
use Illuminate\Database\Seeder;

class DominicaCbiSeeder extends Seeder
{
    public function run(): void
    {
        $program = Program::updateOrCreate(
            ['code' => 'dominica-cbi'],
            [
                'name' => 'Dominica Citizenship by Investment',
                'country_code' => 'DM',
                'description' => null,
                'is_active' => true,
            ]
        );

        $templates = [
            [
                'code' => 'form_d1',
                'name' => 'FORM D1 — Application for Citizenship',
                'file_path' => 'dominica-cbi/FORM_D1.pdf',
                'file_type' => FileType::PDF,
                'mapping_mode' => MappingMode::NAME,
                'sort_order' => 10,
            ],
            [
                'code' => 'form_d2',
                'name' => 'FORM D2 — Affidavit of Identity',
                'file_path' => 'dominica-cbi/FORM_D2.pdf',
                'file_type' => FileType::PDF,
                'mapping_mode' => MappingMode::NAME,
                'sort_order' => 20,
            ],
            [
                'code' => 'form_d3',
                'name' => 'FORM D3 — Medical Questionnaire',
                'file_path' => 'dominica-cbi/FORM_D3.pdf',
                'file_type' => FileType::PDF,
                'mapping_mode' => MappingMode::GEOMETRY,
                'sort_order' => 30,
            ],
            [
                'code' => 'form_d4',
                'name' => 'FORM D4 — Investment & Source of Funds',
                'file_path' => 'dominica-cbi/FORM_D4.pdf',
                'file_type' => FileType::PDF,
                'mapping_mode' => MappingMode::NAME,
                'sort_order' => 40,
            ],
            [
                'code' => 'affidavit_sd',
                'name' => 'Affidavit (SD)',
                'file_path' => 'dominica-cbi/AFFIDAVITSD.pdf',
                'file_type' => FileType::PDF,
                'mapping_mode' => MappingMode::NAME,
                'sort_order' => 50,
            ],
            [
                'code' => 'dominica_epp_sid',
                'name' => 'Dominica ePP/SID',
                'file_path' => 'dominica-cbi/Dominica_ePP_SID.pdf',
                'file_type' => FileType::PDF,
                'mapping_mode' => MappingMode::NAME,
                'sort_order' => 60,
            ],
            [
                'code' => 'e_passport_application',
                'name' => 'E-Passport Application',
                'file_path' => 'dominica-cbi/E-Passport_Application.pdf',
                'file_type' => FileType::PDF,
                'mapping_mode' => MappingMode::NAME,
                'sort_order' => 70,
            ],
            [
                'code' => 'statutory_declaration',
                'name' => 'Statutory Declaration',
                'file_path' => 'dominica-cbi/Statutory_Declaration.docx',
                'file_type' => FileType::DOCX,
                'mapping_mode' => MappingMode::DOCX_JINJA,
                'sort_order' => 110,
            ],
            [
                'code' => 'letter_to_minister',
                'name' => 'Letter to the Minister',
                'file_path' => 'dominica-cbi/Letter_to_Minister.docx',
                'file_type' => FileType::DOCX,
                'mapping_mode' => MappingMode::DOCX_JINJA,
                'sort_order' => 120,
            ],
            [
                'code' => 'letter_to_minister_family',
                'name' => 'Letter to the Minister (Family)',
                'file_path' => 'dominica-cbi/Letter_to_Minister_Family.docx',
                'file_type' => FileType::DOCX,
                'mapping_mode' => MappingMode::DOCX_JINJA,
                'sort_order' => 130,
            ],
            [
                'code' => 'lpa_mmce',
                'name' => 'LPA — MMCE',
                'file_path' => 'dominica-cbi/LPA_MMCE.docx',
                'file_type' => FileType::DOCX,
                'mapping_mode' => MappingMode::DOCX_JINJA,
                'sort_order' => 140,
            ],
            [
                'code' => 'affidavit_source_of_funds',
                'name' => 'Affidavit of Source of Funds',
                'file_path' => 'dominica-cbi/Affidavit_of_Source_of_Funds.docx',
                'file_type' => FileType::DOCX,
                'mapping_mode' => MappingMode::DOCX_JINJA,
                'sort_order' => 150,
            ],
            [
                'code' => 'form_12',
                'name' => 'FORM 12',
                'file_path' => 'dominica-cbi/FORM_12.docx',
                'file_type' => FileType::DOCX,
                'mapping_mode' => MappingMode::DOCX_JINJA,
                'sort_order' => 160,
            ],
        ];

        foreach ($templates as $data) {
            FormTemplate::updateOrCreate(
                ['program_id' => $program->id, 'code' => $data['code']],
                array_merge($data, [
                    'file_hash' => null,
                    'page_count' => null,
                    'field_count' => null,
                    'is_active' => true,
                ])
            );
        }
    }
}
