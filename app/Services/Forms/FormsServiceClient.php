<?php

namespace App\Services\Forms;

use App\Enums\Forms\FieldType;
use App\Exceptions\Forms\FormsServiceAuthException;
use App\Exceptions\Forms\FormsServiceUnreachableException;
use App\Exceptions\Forms\FormsServiceValidationException;
use App\Exceptions\Forms\TemplateNotFoundException;
use App\Services\Forms\Data\InspectedField;
use App\Services\Forms\Data\InspectResponse;
use App\Services\Forms\Data\OcrRegionResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Psr\Log\LoggerInterface;

class FormsServiceClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly string $token,
        private readonly int $timeout,
        private readonly LoggerInterface $logger,
    ) {}

    public function inspectPdf(string $templatePath): InspectResponse
    {
        $response = $this->send('/pdf/inspect', ['template_path' => $templatePath]);
        $data = $response->json();

        $fields = array_map(fn (array $f) => new InspectedField(
            page: $f['page'],
            name: $f['name'],
            type: FieldType::from($f['type']),
            rectPdf: $f['rect_pdf'] ?? null,
            pageSizePdf: $f['page_size_pdf'] ?? null,
            exportValues: $f['export_values'] ?? null,
        ), $data['fields'] ?? []);

        return new InspectResponse(
            pageCount: $data['page_count'],
            fields: $fields,
        );
    }

    public function renderPage(string $templatePath, int $page, ?int $dpi = null): string
    {
        return $this->send('/pdf/render-page', [
            'template_path' => $templatePath,
            'page' => $page,
            'dpi' => $dpi ?? config('forms.page_render_dpi'),
        ])->body();
    }

    public function fillPdf(string $templatePath, array $mapping, array $applicantData, ?bool $flatten = null): string
    {
        return $this->send('/pdf/fill', [
            'template_path' => $templatePath,
            'mapping' => empty($mapping) ? new \stdClass : $mapping,
            'applicant' => $applicantData,
            'flatten' => $flatten ?? config('forms.flatten_pdfs'),
        ])->body();
    }

    public function renderDocx(string $templatePath, array $context): string
    {
        return $this->send('/docx/render', [
            'template_path' => $templatePath,
            'context' => $context,
        ])->body();
    }

    public function ocrRegion(string $templatePath, int $page, array $rectPdf, int $expandPx = 150): OcrRegionResponse
    {
        $data = $this->send('/pdf/ocr-region', [
            'template_path' => $templatePath,
            'page' => $page,
            'rect_pdf' => $rectPdf,
            'expand_px' => $expandPx,
        ])->json();

        return new OcrRegionResponse(
            text: $data['text'],
            confidence: (float) $data['confidence'],
        );
    }

    private function send(string $path, array $data): Response
    {
        $start = microtime(true);
        $url = rtrim($this->baseUrl, '/').$path;

        try {
            $response = Http::withToken($this->token)
                ->withUserAgent('salf-crm-v2/forms-feature')
                ->timeout($this->timeout)
                ->retry(3, 250, function (\Throwable $exception) {
                    return $exception instanceof ConnectionException
                        || ($exception instanceof RequestException && $exception->response->serverError());
                })
                ->throw()
                ->post($url, $data);

            $this->logCall($path, $data['template_path'] ?? '', $response->status(), $start);

            return $response;
        } catch (ConnectionException $e) {
            $this->logCall($path, $data['template_path'] ?? '', 0, $start, $e->getMessage());
            throw new FormsServiceUnreachableException(
                "Forms service unreachable: {$e->getMessage()}", 0, $e
            );
        } catch (RequestException $e) {
            $status = $e->response->status();
            $this->logCall($path, $data['template_path'] ?? '', $status, $start);

            if ($status === 401) {
                throw new FormsServiceAuthException(
                    'Forms service authentication failed (401)', $status, $e
                );
            }

            if ($status === 404) {
                throw new TemplateNotFoundException(
                    'Template not found: '.($data['template_path'] ?? ''), $status, $e
                );
            }

            if ($status === 400) {
                $detail = $e->response->json('detail') ?? $e->response->body();
                throw new FormsServiceValidationException(
                    "Forms service validation error: {$detail}", $status, $e
                );
            }

            throw new FormsServiceUnreachableException(
                "Forms service error {$status}: {$e->response->body()}", $status, $e
            );
        }
    }

    private function logCall(string $path, string $template, int $status, float $start, ?string $error = null): void
    {
        $durationMs = (int) round((microtime(true) - $start) * 1000);

        $context = [
            'path' => $path,
            'template' => $template,
            'status' => $status,
            'duration_ms' => $durationMs,
        ];

        if ($error !== null) {
            $this->logger->warning("forms-service call failed: {$error}", $context);
        } else {
            $this->logger->info("forms-service POST {$path}", $context);
        }
    }
}
