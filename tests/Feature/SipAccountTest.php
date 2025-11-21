<?php

it('requires authentication for sip account routes', function () {
    $response = $this->get('/sip-accounts');
    $response->assertRedirect('/login');

    $response = $this->post('/sip-accounts');
    $response->assertRedirect('/login');
});

it('sip account routes exist', function () {
    $user = \App\Models\User::factory()->create();
    $this->actingAs($user);

    $response = $this->get('/sip-accounts');
    $response->assertOk();

    $response = $this->get('/sip-accounts/create');
    $response->assertOk();
});
