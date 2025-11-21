<?php

use App\Services\AsteriskService;

it('can be instantiated', function () {
    $service = new AsteriskService;

    expect($service)->toBeInstanceOf(AsteriskService::class);
});

it('can generate channel id', function () {
    $service = new AsteriskService;

    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('generateChannelId');
    $method->setAccessible(true);

    $channelId1 = $method->invoke($service);
    $channelId2 = $method->invoke($service);

    expect($channelId1)->toBeString()
        ->and($channelId1)->not->toEqual($channelId2);
});
