<?php

use App\Models\Forms\FormTemplate;
use App\Models\Forms\Program;
use Database\Seeders\Forms\DominicaCbiSeeder;

it('creates one program and 13 templates with expected codes', function () {
    $this->seed(DominicaCbiSeeder::class);

    expect(Program::where('code', 'dominica-cbi')->count())->toBe(1);
    expect(FormTemplate::whereHas('program', fn ($q) => $q->where('code', 'dominica-cbi'))->count())->toBe(13);

    $expectedCodes = [
        'form_d1', 'form_d2', 'form_d3', 'form_d4',
        'affidavit_sd', 'dominica_epp_sid', 'e_passport_application',
        'statutory_declaration', 'letter_to_minister', 'letter_to_minister_family',
        'lpa_mmce', 'affidavit_source_of_funds', 'form_12',
    ];

    $program = Program::where('code', 'dominica-cbi')->first();
    $actualCodes = $program->formTemplates()->pluck('code')->toArray();

    foreach ($expectedCodes as $code) {
        expect($actualCodes)->toContain($code);
    }
});

it('is idempotent — re-running seeder does not create duplicates', function () {
    $this->seed(DominicaCbiSeeder::class);
    $this->seed(DominicaCbiSeeder::class);

    expect(Program::where('code', 'dominica-cbi')->count())->toBe(1);
    expect(FormTemplate::whereHas('program', fn ($q) => $q->where('code', 'dominica-cbi'))->count())->toBe(13);
});
