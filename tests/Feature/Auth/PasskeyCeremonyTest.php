<?php

use App\Models\User;
use Laravel\Passkeys\Actions\GenerateRegistrationOptions;
use Laravel\Passkeys\Actions\GenerateVerificationOptions;
use Laravel\Passkeys\Actions\StorePasskey;
use Laravel\Passkeys\Actions\VerifyPasskey;
use Laravel\Passkeys\Support\WebAuthn;

/**
 * These tests drive the full HTTP ceremony — routing, middleware, request
 * deserialization, session option retrieval, the auth guard, and the response —
 * with structurally valid (but unsigned) WebAuthn credentials. Only the
 * cryptographic validation actions are mocked, since the signature math is
 * covered upstream in web-auth/webauthn-lib.
 */
function passkeyB64Url(string $bytes): string
{
    return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
}

function passkeyAssertionCredential(): array
{
    $authenticatorData = hash('sha256', 'localhost', true).chr(0x01).pack('N', 0);
    $clientDataJson = json_encode([
        'type' => 'webauthn.get',
        'challenge' => passkeyB64Url(str_repeat('x', 32)),
        'origin' => 'http://localhost',
    ]);

    return [
        'id' => passkeyB64Url('cred-id-1234567890'),
        'rawId' => passkeyB64Url('cred-id-1234567890'),
        'type' => 'public-key',
        'response' => [
            'clientDataJSON' => passkeyB64Url($clientDataJson),
            'authenticatorData' => passkeyB64Url($authenticatorData),
            'signature' => passkeyB64Url('signature-bytes'),
        ],
    ];
}

function passkeyRegistrationCredential(): array
{
    $authenticatorData = hash('sha256', 'localhost', true).chr(0x01).pack('N', 0);
    $attestationObject = "\xA3"
        ."\x63".'fmt'."\x64".'none'
        ."\x67".'attStmt'."\xA0"
        ."\x68".'authData'."\x58".chr(strlen($authenticatorData)).$authenticatorData;
    $clientDataJson = json_encode([
        'type' => 'webauthn.create',
        'challenge' => passkeyB64Url(str_repeat('x', 32)),
        'origin' => 'http://localhost',
    ]);

    return [
        'id' => passkeyB64Url('cred-id-1234567890'),
        'rawId' => passkeyB64Url('cred-id-1234567890'),
        'type' => 'public-key',
        'response' => [
            'clientDataJSON' => passkeyB64Url($clientDataJson),
            'attestationObject' => passkeyB64Url($attestationObject),
        ],
    ];
}

test('a passkey is registered through the full registration ceremony', function () {
    $user = User::factory()->create();

    $options = app(GenerateRegistrationOptions::class)($user);

    $stored = $user->passkeys()->create([
        'name' => 'Test Key',
        'credential_id' => passkeyB64Url('cred-id-1234567890'),
        'credential' => ['foo' => 'bar'],
    ]);

    $this->mock(StorePasskey::class)
        ->shouldReceive('__invoke')
        ->once()
        ->andReturn($stored);

    $this->actingAs($user)
        ->withSession([
            'auth.password_confirmed_at' => time(),
            'passkey.registration_options' => WebAuthn::toJson($options),
        ])
        ->postJson('/user/passkeys', [
            'name' => 'Test Key',
            'credential' => passkeyRegistrationCredential(),
        ])
        ->assertOk()
        ->assertJson(['status' => 'passkey-registered', 'name' => 'Test Key']);
});

test('registration rejects a malformed credential payload', function () {
    $user = User::factory()->create();
    $options = app(GenerateRegistrationOptions::class)($user);

    $this->actingAs($user)
        ->withSession([
            'auth.password_confirmed_at' => time(),
            'passkey.registration_options' => WebAuthn::toJson($options),
        ])
        ->postJson('/user/passkeys', [
            'name' => 'Bad Key',
            'credential' => ['id' => 'x', 'rawId' => 'x', 'type' => 'public-key', 'response' => ['garbage' => 'value']],
        ])
        ->assertStatus(422);
});

test('a user is authenticated through the full passkey login ceremony', function () {
    $user = User::factory()->create();
    $passkey = $user->passkeys()->create([
        'name' => 'Login Key',
        'credential_id' => passkeyB64Url('cred-id-1234567890'),
        'credential' => ['foo' => 'bar'],
    ]);

    $options = app(GenerateVerificationOptions::class)();

    $this->mock(VerifyPasskey::class)
        ->shouldReceive('__invoke')
        ->once()
        ->andReturn($passkey);

    $this->withSession(['passkey.verification_options' => WebAuthn::toJson($options)])
        ->postJson('/passkeys/login', [
            'credential' => passkeyAssertionCredential(),
        ])
        ->assertOk()
        ->assertJsonStructure(['redirect']);

    $this->assertAuthenticatedAs($user);
});

test('passkey login fails when the verification options session is missing', function () {
    User::factory()->create();

    $this->postJson('/passkeys/login', [
        'credential' => passkeyAssertionCredential(),
    ])->assertStatus(422);
});
