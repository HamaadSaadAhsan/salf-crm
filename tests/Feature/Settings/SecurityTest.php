<?php

use App\Models\User;

test('security settings page renders for an authenticated user', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/settings/security')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/security')
            ->has('passkeys', 0)
            ->where('twoFactorEnabled', false)
        );
});

test('security settings page lists the user passkeys', function () {
    $user = User::factory()->create();
    $user->passkeys()->create([
        'name' => 'My Key',
        'credential_id' => 'cred-1',
        'credential' => ['foo' => 'bar'],
    ]);

    $this->actingAs($user)
        ->get('/settings/security')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/security')
            ->has('passkeys', 1)
            ->where('passkeys.0.name', 'My Key')
        );
});

test('security settings page reports enabled two-factor authentication', function () {
    $user = User::factory()->create();
    $user->forceFill([
        'two_factor_secret' => encrypt('secret'),
        'two_factor_confirmed_at' => now(),
    ])->save();

    $this->actingAs($user)
        ->get('/settings/security')
        ->assertInertia(fn ($page) => $page->where('twoFactorEnabled', true));
});

test('guests cannot view the security settings page', function () {
    $this->get('/settings/security')->assertRedirect('/login');
});
