<?php

namespace App\Jobs\Forms;

use App\Enums\Forms\FileType;
use App\Enums\Forms\GenerationStatus;
use App\Exceptions\Forms\FormsServiceAuthException;
use App\Models\Forms\Application;
use App\Models\Forms\ApplicationGeneration;
use App\Services\Forms\FormsServiceClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class GenerateApplicationFormsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 600;

    public int $backoff = 30;

    public function __construct(
        public readonly int $applicationId,
        public readonly int $generationId,
    ) {
        $this->onQueue(config('forms.job_queue'));
    }

    public function handle(FormsServiceClient $client): void
    {
        $application = Application::with('program')->findOrFail($this->applicationId);

        $generation = ApplicationGeneration::findOrFail($this->generationId);
        $generation->update(['status' => GenerationStatus::RUNNING, 'started_at' => now()]);

        $templates = $application->program->activeTemplates()->with('fieldMappings')->get();

        $log = [];
        $generatedFiles = [];

        foreach ($templates as $template) {
            try {
                $mappingPayload = $this->buildMappingPayload($template->fieldMappings);
                $ext = $template->file_type === FileType::PDF ? 'pdf' : 'docx';
                $filePath = "generated/{$application->application_code}/{$generation->id}/{$template->code}.{$ext}";

                if ($template->file_type === FileType::PDF) {
                    $bytes = $client->fillPdf($template->file_path, $mappingPayload, $application->canonicalData());
                } else {
                    $bytes = $client->renderDocx($template->file_path, $application->canonicalData());
                }

                Storage::disk(config('forms.output_disk'))->put($filePath, $bytes);
                $generatedFiles[] = $filePath;

                $log[] = [
                    'template_id' => $template->id,
                    'template_code' => $template->code,
                    'status' => 'ok',
                    'filled_field_count' => count($mappingPayload),
                ];
            } catch (FormsServiceAuthException $e) {
                Log::channel('forms')->warning("GenerateApplicationFormsJob: auth failure on template {$template->code}", [
                    'application_id' => $application->id,
                    'generation_id' => $generation->id,
                    'error' => $e->getMessage(),
                ]);

                throw $e;
            } catch (\Throwable $e) {
                Log::channel('forms')->warning("GenerateApplicationFormsJob: template {$template->code} failed", [
                    'application_id' => $application->id,
                    'generation_id' => $generation->id,
                    'error' => $e->getMessage(),
                ]);

                $log[] = [
                    'template_id' => $template->id,
                    'template_code' => $template->code,
                    'status' => 'error',
                    'filled_field_count' => 0,
                    'error' => $e->getMessage(),
                ];
            }
        }

        $zipPath = null;

        if (! empty($generatedFiles)) {
            $zipPath = "generated/{$application->application_code}/{$generation->id}/bundle.zip";
            $zipAbsPath = Storage::disk(config('forms.output_disk'))->path($zipPath);

            $zip = new \ZipArchive;
            $zip->open($zipAbsPath, \ZipArchive::CREATE);

            foreach ($generatedFiles as $file) {
                $zip->addFile(Storage::disk(config('forms.output_disk'))->path($file), basename($file));
            }

            $zip->close();
        }

        $status = empty($generatedFiles) ? GenerationStatus::FAILED : GenerationStatus::COMPLETED;

        $generation->update([
            'output_path' => $zipPath,
            'file_count' => count($generatedFiles),
            'generation_log' => $log,
            'status' => $status,
            'completed_at' => now(),
            'error_message' => empty($generatedFiles) ? 'All templates failed to generate' : null,
        ]);
    }

    public function failed(\Throwable $e): void
    {
        ApplicationGeneration::where('id', $this->generationId)->update([
            'status' => GenerationStatus::FAILED,
            'error_message' => $e->getMessage(),
            'completed_at' => now(),
        ]);
    }

    /**
     * @return array<string, string|array{path: string, export_value: string}>
     */
    private function buildMappingPayload(Collection $fieldMappings): array
    {
        $payload = [];

        foreach ($fieldMappings as $mapping) {
            if ($mapping->value_for_truthy) {
                $payload[$mapping->field_name] = [
                    'path' => $mapping->canonical_path,
                    'export_value' => $mapping->value_for_truthy,
                ];
            } else {
                $payload[$mapping->field_name] = $mapping->canonical_path;
            }
        }

        return $payload;
    }
}
