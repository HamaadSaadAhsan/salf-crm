<?php

use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

beforeEach(function () {
    config([
        'services.forms_app.url' => 'https://forms-app.test',
        'services.forms_app.jwt.secret' => 'test-secret-32-bytes-aaaaaaaaaaaaa',
        'services.forms_app.jwt.issuer' => 'salf-crm',
        'services.forms_app.jwt.audience' => 'forms-app',
        'services.forms_app.jwt.ttl_seconds' => 300,
    ]);
});

it('redirects unauthenticated users away from the forms-app hand-off', function () {
    $this->get('/forms-app/applications')->assertRedirect('/login');
});

it('redirects authed users to forms-app with a JWT carrying their identity', function () {
    $user = User::factory()->create([
        'name' => 'Alice Tester',
        'email_verified_at' => now(),
    ]);

    $response = $this->actingAs($user)->get('/forms-app/applications');

    $response->assertStatus(302);
    $location = $response->headers->get('Location');

    expect($location)->toStartWith('https://forms-app.test/applications?token=');

    parse_str(parse_url($location, PHP_URL_QUERY), $query);
    $token = $query['token'] ?? null;
    expect($token)->not->toBeNull();

    $payload = (array) JWT::decode(
        $token,
        new Key('test-secret-32-bytes-aaaaaaaaaaaaa', 'HS256')
    );

    expect($payload)
        ->iss->toBe('salf-crm')
        ->and($payload['aud'])->toBe('forms-app')
        ->and((int) $payload['sub'])->toBe($user->id)
        ->and($payload['name'])->toBe('Alice Tester');
});

it('hand-off to the forms-app home also carries a JWT', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $response = $this->actingAs($user)->get('/forms-app');

    $response->assertStatus(302);
    expect($response->headers->get('Location'))
        ->toStartWith('https://forms-app.test/?token=');
});
