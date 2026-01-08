<?php

use App\Jobs\ProcessCallInitiation;
use App\Models\CallSession;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('has correct properties', function () {
    $callSession = CallSession::factory()->create([
        'caller_number' => '+1234567890',
        'callee_number' => '1001',
    ]);

    $job = new ProcessCallInitiation($callSession);

    expect($job->tries)->toBe(3)
        ->and($job->backoff())->toBe([10, 30, 60]);
});

it('can be instantiated', function () {
    $callSession = CallSession::factory()->create([
        'caller_number' => '+1234567890',
        'callee_number' => '1001',
    ]);

    $job = new ProcessCallInitiation($callSession);

    expect($job)->toBeInstanceOf(ProcessCallInitiation::class);
});
