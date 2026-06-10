<?php

use App\Models\User;

function userWithTwoFactor(): User
{
    $user = User::factory()->create();

    $user->forceFill([
        'two_factor_secret' => encrypt('secret'),
        'two_factor_confirmed_at' => now(),
    ])->save();

    return $user;
}

test('a user with two-factor enabled is redirected to the challenge on login', function () {
    $user = userWithTwoFactor();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertRedirect(route('two-factor.login'));

    $this->assertGuest();
});

test('the two-factor challenge page renders for a pending login', function () {
    $user = userWithTwoFactor();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->get('/two-factor-challenge')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('auth/two-factor-challenge'));
});

test('guests without a pending login are redirected from the challenge', function () {
    $this->get('/two-factor-challenge')->assertRedirect('/login');
});
