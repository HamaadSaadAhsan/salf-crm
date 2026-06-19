<?php

use App\Models\User;

test('guests can fetch passkey login options', function () {
    $this->getJson('/passkeys/login/options')
        ->assertOk()
        ->assertJsonStructure(['options']);
});

test('authenticated users can fetch passkey registration options without confirming a password', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson('/user/passkeys/options')
        ->assertOk()
        ->assertJsonStructure(['options']);
});

test('a user cannot delete another users passkey', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    $passkey = $other->passkeys()->create([
        'name' => 'Theirs',
        'credential_id' => 'cred-other',
        'credential' => ['foo' => 'bar'],
    ]);

    $this->actingAs($user)
        ->deleteJson("/user/passkeys/{$passkey->id}")
        ->assertForbidden();

    expect($other->passkeys()->count())->toBe(1);
});

test('a user can delete their own passkey', function () {
    $user = User::factory()->create();

    $passkey = $user->passkeys()->create([
        'name' => 'Mine',
        'credential_id' => 'cred-mine',
        'credential' => ['foo' => 'bar'],
    ]);

    $this->actingAs($user)
        ->deleteJson("/user/passkeys/{$passkey->id}")
        ->assertOk();

    expect($user->passkeys()->count())->toBe(0);
});
