<?php

use App\Models\CallSession;
use App\Models\SipAccount;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('has callerSipAccount relationship', function () {
    $user = User::factory()->create();
    $sipAccount = SipAccount::factory()->create(['user_id' => $user->id]);

    $callSession = CallSession::factory()->create([
        'caller_id' => $user->id,
        'caller_sip_account_id' => $sipAccount->id,
    ]);

    expect($callSession->callerSipAccount)->toBeInstanceOf(SipAccount::class)
        ->and($callSession->callerSipAccount->id)->toBe($sipAccount->id);
});

it('has calleeSipAccount relationship', function () {
    $caller = User::factory()->create();
    $callee = User::factory()->create();
    $calleeSipAccount = SipAccount::factory()->create(['user_id' => $callee->id]);

    $callSession = CallSession::factory()->create([
        'caller_id' => $caller->id,
        'callee_sip_account_id' => $calleeSipAccount->id,
    ]);

    expect($callSession->calleeSipAccount)->toBeInstanceOf(SipAccount::class)
        ->and($callSession->calleeSipAccount->id)->toBe($calleeSipAccount->id);
});

it('can eager load sip account relationships', function () {
    $caller = User::factory()->create();
    $callee = User::factory()->create();
    $callerSipAccount = SipAccount::factory()->create(['user_id' => $caller->id]);
    $calleeSipAccount = SipAccount::factory()->create(['user_id' => $callee->id]);

    $callSession = CallSession::factory()->create([
        'caller_id' => $caller->id,
        'caller_sip_account_id' => $callerSipAccount->id,
        'callee_sip_account_id' => $calleeSipAccount->id,
    ]);

    $loaded = CallSession::with(['callerSipAccount', 'calleeSipAccount'])
        ->find($callSession->id);

    expect($loaded->relationLoaded('callerSipAccount'))->toBeTrue()
        ->and($loaded->relationLoaded('calleeSipAccount'))->toBeTrue()
        ->and($loaded->callerSipAccount->id)->toBe($callerSipAccount->id)
        ->and($loaded->calleeSipAccount->id)->toBe($calleeSipAccount->id);
});
