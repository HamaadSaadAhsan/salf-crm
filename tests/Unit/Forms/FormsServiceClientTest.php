<?php

use App\Exceptions\Forms\FormsServiceAuthException;
use App\Exceptions\Forms\FormsServiceUnreachableException;
use App\Exceptions\Forms\FormsServiceValidationException;
use App\Services\Forms\Data\InspectResponse;
use App\Services\Forms\FormsServiceClient;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Psr\Log\NullLogger;
use Tests\TestCase;

uses(TestCase::class);

function makeFormsClient(): FormsServiceClient
{
    return new FormsServiceClient(
        baseUrl: 'http://forms-test.local',
        token: 'test-token',
        timeout: 5,
        logger: new NullLogger,
    );
}

it('inspectPdf returns a populated InspectResponse with correct field count', function () {
    Http::fake([
        '*/pdf/inspect' => Http::response([
            'page_count' => 3,
            'fields' => [
                ['page' => 1, 'name' => 'Surname', 'type' => 'text', 'rect_pdf' => [10.0, 20.0, 100.0, 50.0], 'page_size_pdf' => [612.0, 792.0], 'export_values' => null],
                ['page' => 1, 'name' => 'Given Name', 'type' => 'text', 'rect_pdf' => null, 'page_size_pdf' => null, 'export_values' => null],
                ['page' => 2, 'name' => 'Check Box5', 'type' => 'checkbox', 'rect_pdf' => [50.0, 100.0, 80.0, 120.0], 'page_size_pdf' => [612.0, 792.0], 'export_values' => ['Yes', 'Off']],
            ],
        ], 200),
    ]);

    $response = makeFormsClient()->inspectPdf('dominica-cbi/FORM_D1.pdf');

    expect($response)->toBeInstanceOf(InspectResponse::class);
    expect($response->pageCount)->toBe(3);
    expect($response->fields)->toHaveCount(3);
    expect($response->fields[2]->name)->toBe('Check Box5');
    expect($response->fields[2]->exportValues)->toContain('Yes');
});

it('throws FormsServiceAuthException on 401', function () {
    Http::fake(['*' => Http::response([], 401)]);

    makeFormsClient()->inspectPdf('test.pdf');
})->throws(FormsServiceAuthException::class);

it('throws FormsServiceValidationException on 400 with detail in message', function () {
    Http::fake([
        '*' => Http::response(['detail' => 'template_path field is required'], 400),
    ]);

    try {
        makeFormsClient()->inspectPdf('test.pdf');
        $this->fail('Expected FormsServiceValidationException');
    } catch (FormsServiceValidationException $e) {
        expect($e->getMessage())->toContain('template_path field is required');
    }
});

it('retries on 500 and succeeds when service recovers on third attempt', function () {
    Http::fake([
        '*/pdf/inspect' => Http::sequence()
            ->push([], 500)
            ->push([], 500)
            ->push(['page_count' => 2, 'fields' => []], 200),
    ]);

    $response = makeFormsClient()->inspectPdf('test.pdf');

    expect($response->pageCount)->toBe(2);
});

it('throws FormsServiceUnreachableException after three consecutive 500 responses', function () {
    Http::fake([
        '*' => Http::sequence()
            ->push([], 500)
            ->push([], 500)
            ->push([], 500),
    ]);

    makeFormsClient()->inspectPdf('test.pdf');
})->throws(FormsServiceUnreachableException::class);

it('fillPdf sends object-shaped mapping for checkbox fields', function () {
    Http::fake(['*/pdf/fill' => Http::response('%PDF-1.4 fake', 200)]);

    $mapping = [
        'Surname' => 'main_applicant.surname',
        'Check Box5' => ['path' => 'main_applicant.gender.male', 'export_value' => 'Yes'],
    ];

    makeFormsClient()->fillPdf('test.pdf', $mapping, ['main_applicant' => ['surname' => 'Smith']]);

    Http::assertSent(function (Request $request) {
        $body = $request->data();

        return $body['mapping']['Surname'] === 'main_applicant.surname'
            && isset($body['mapping']['Check Box5']['path'])
            && $body['mapping']['Check Box5']['export_value'] === 'Yes';
    });
});

it('fillPdf returns PDF bytes starting with %PDF-', function () {
    Http::fake(['*/pdf/fill' => Http::response('%PDF-1.4 fake content', 200)]);

    $result = makeFormsClient()->fillPdf('test.pdf', ['Surname' => 'main_applicant.surname'], []);

    expect($result)->toStartWith('%PDF-');
});
