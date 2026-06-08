<?php

namespace App\Console\Commands;

use App\Services\Forms\FormsAppClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Smoke-test the CRM ↔ forms-app contract end-to-end.
 *
 * Mints a JWT for an arbitrary user (default sub=1, role=admin), then hits
 * a couple of forms-app endpoints to verify the round trip:
 *   1. GET /api/leads/{uuid}/forms/applications  (lead-scoped, returns [])
 *   2. GET /api/forms/programs/{id}/schema       (admin route, returns schema)
 *
 * Failure means: secret mismatch, forms-app down, or contract drift.
 */
class FormsAppPing extends Command
{
    protected $signature = 'forms-app:ping
        {--user-id=1 : Subject claim for the test JWT}
        {--name=CRM Ping : Name claim}
        {--role=admin : Role claim}
        {--lead= : Lead UUID to query (defaults to a zero UUID)}
        {--program=1 : Program id to query for schema}';

    protected $description = 'Mint a JWT and round-trip a couple of calls to the standalone forms-app to verify the integration.';

    public function handle(FormsAppClient $client): int
    {
        $base = (string) config('services.forms_app.url');
        $this->components->info("Target: {$base}");

        $token = $client->tokenForUser(
            (int) $this->option('user-id'),
            (string) $this->option('name'),
            [(string) $this->option('role')],
        );

        $this->components->task('JWT mint', fn () => $token !== '');

        $leadId = (string) ($this->option('lead') ?: '00000000-0000-0000-0000-000000000000');
        $programId = (int) $this->option('program');

        $leadOk = false;
        $this->components->task("GET /api/leads/{$leadId}/forms/applications", function () use ($base, $token, $leadId, &$leadOk) {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(10)
                ->get("{$base}/api/leads/{$leadId}/forms/applications");

            $leadOk = $response->successful();
            if (! $leadOk) {
                $this->error("  HTTP {$response->status()}: ".$response->body());
            } else {
                $count = count((array) $response->json('data', []));
                $this->line("  → {$count} application(s)");
            }

            return $leadOk;
        });

        $schemaOk = false;
        $this->components->task("GET /api/forms/programs/{$programId}/schema", function () use ($base, $token, $programId, &$schemaOk) {
            $response = Http::withToken($token)
                ->acceptJson()
                ->timeout(10)
                ->get("{$base}/api/forms/programs/{$programId}/schema");

            $schemaOk = $response->successful();
            if (! $schemaOk) {
                $this->error("  HTTP {$response->status()}: ".$response->body());
            } else {
                $sections = count((array) $response->json('sections', []));
                $this->line("  → schema has {$sections} section(s)");
            }

            return $schemaOk;
        });

        if (! $leadOk || ! $schemaOk) {
            $this->components->error('Ping failed — see errors above.');

            return self::FAILURE;
        }

        $this->components->success('forms-app integration is reachable.');

        return self::SUCCESS;
    }
}
