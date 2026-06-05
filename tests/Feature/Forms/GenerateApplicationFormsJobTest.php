<?php

use App\Enums\Forms\GenerationStatus;
use App\Exceptions\Forms\FormsServiceAuthException;
use App\Jobs\Forms\GenerateApplicationFormsJob;
use App\Models\Forms\Application;
use App\Models\Forms\ApplicationGeneration;
use App\Models\Forms\FieldMapping;
use App\Models\Forms\FormTemplate;
use App\Models\Forms\Program;
use App\Models\User;
use App\Services\Forms\FormsServiceClient;
use Illuminate\Support\Facades\Storage;

function makeFormsJobFixture(): array
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $program = Program::factory()->create();

    $pdfTemplate = FormTemplate::factory()->pdf()->create([
        'program_id' => $program->id,
        'code' => 'form_d1',
        'sort_order' => 10,
    ]);

    $docxTemplate = FormTemplate::factory()->docx()->create([
        'program_id' => $program->id,
        'code' => 'letter',
        'sort_order' => 20,
    ]);

    FieldMapping::create([
        'form_template_id' => $pdfTemplate->id,
        'field_name' => 'Surname',
        'canonical_path' => 'main_applicant.surname',
    ]);

    FieldMapping::create([
        'form_template_id' => $docxTemplate->id,
        'field_name' => 'name',
        'canonical_path' => 'main_applicant.name',
    ]);

    $application = Application::factory()->create([
        'program_id' => $program->id,
        'created_by_user_id' => $user->id,
        'data' => ['main_applicant' => ['surname' => 'Smith', 'name' => 'John']],
    ]);

    return compact('user', 'program', 'application', 'pdfTemplate', 'docxTemplate');
}

it('creates a completed generation with a ZIP containing one file per template', function () {
    Storage::fake('forms_output');

    ['user' => $user, 'application' => $application] = makeFormsJobFixture();

    $mockClient = Mockery::mock(FormsServiceClient::class);
    $mockClient->shouldReceive('fillPdf')->once()->andReturn('%PDF-1.4 fake pdf bytes');
    $mockClient->shouldReceive('renderDocx')->once()->andReturn('PK docx fake bytes');

    $this->app->instance(FormsServiceClient::class, $mockClient);

    $generation = ApplicationGeneration::create([
        'application_id' => $application->id,
        'generated_by_user_id' => $user->id,
        'status' => GenerationStatus::PENDING,
    ]);

    GenerateApplicationFormsJob::dispatchSync($application->id, $generation->id, $user->id);

    $generation->refresh();

    expect($generation)->not->toBeNull();
    expect($generation->status)->toBe(GenerationStatus::COMPLETED);
    expect($generation->file_count)->toBe(2);
    expect($generation->generation_log)->toBeArray()->not->toBeEmpty();

    Storage::disk('forms_output')->assertExists($generation->output_path);

    $zipAbsPath = Storage::disk('forms_output')->path($generation->output_path);
    $zip = new ZipArchive;
    $zip->open($zipAbsPath);
    expect($zip->numFiles)->toBe(2);
    $zip->close();
});

it('logs per-template error but completes job when one template fails', function () {
    Storage::fake('forms_output');

    ['user' => $user, 'application' => $application] = makeFormsJobFixture();

    $mockClient = Mockery::mock(FormsServiceClient::class);
    $mockClient->shouldReceive('fillPdf')->once()->andThrow(new RuntimeException('PDF render failed'));
    $mockClient->shouldReceive('renderDocx')->once()->andReturn('PK docx fake bytes');

    $this->app->instance(FormsServiceClient::class, $mockClient);

    $generation = ApplicationGeneration::create([
        'application_id' => $application->id,
        'generated_by_user_id' => $user->id,
        'status' => GenerationStatus::PENDING,
    ]);

    GenerateApplicationFormsJob::dispatchSync($application->id, $generation->id, $user->id);

    $generation->refresh();

    expect($generation->status)->toBe(GenerationStatus::COMPLETED);
    expect($generation->file_count)->toBe(1);

    $errorEntry = collect($generation->generation_log)->firstWhere('status', 'error');
    expect($errorEntry)->not->toBeNull();
    expect($errorEntry['error'])->toBe('PDF render failed');
});

it('marks generation failed and sets error_message when auth exception is thrown', function () {
    Storage::fake('forms_output');

    ['user' => $user, 'application' => $application] = makeFormsJobFixture();

    $authException = new FormsServiceAuthException('Forms service authentication failed (401)', 401);

    $mockClient = Mockery::mock(FormsServiceClient::class);
    $mockClient->shouldReceive('fillPdf')->andThrow($authException);
    $mockClient->shouldReceive('renderDocx')->andThrow($authException);

    $generation = ApplicationGeneration::create([
        'application_id' => $application->id,
        'generated_by_user_id' => $user->id,
        'status' => GenerationStatus::PENDING,
    ]);

    $job = new GenerateApplicationFormsJob($application->id, $generation->id, $user->id);

    try {
        $job->handle($mockClient);
    } catch (FormsServiceAuthException $e) {
        $job->failed($e);
    }

    $generation->refresh();

    expect($generation)->not->toBeNull();
    expect($generation->status)->toBe(GenerationStatus::FAILED);
    expect($generation->error_message)->not->toBeNull();
    expect($generation->error_message)->toContain('authentication failed');
});
