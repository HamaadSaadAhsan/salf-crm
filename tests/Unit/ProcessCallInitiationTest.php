<?php

use App\Jobs\ProcessCallInitiation;

it('has correct properties', function () {
    $job = new ProcessCallInitiation(1, '+1234567890', '1001');

    expect($job->tries)->toBe(3)
        ->and($job->backoff())->toBe([10, 30, 60]);
});

it('can be instantiated', function () {
    $job = new ProcessCallInitiation(1, '+1234567890', '1001');

    expect($job)->toBeInstanceOf(ProcessCallInitiation::class);
});
