<?php

use App\Services\AsteriskService;
use Illuminate\Http\Client\Factory as HttpFactory;

it('can be instantiated', function () {
    $httpClient = new HttpFactory;

    $service = new AsteriskService(
        httpClient: $httpClient,
        host: 'localhost',
        port: '8088',
        username: 'admin',
        secret: 'admin'
    );

    expect($service)->toBeInstanceOf(AsteriskService::class);
});

it('can generate channel id', function () {
    $httpClient = new HttpFactory;

    $service = new AsteriskService(
        httpClient: $httpClient,
        host: 'localhost',
        port: '8088',
        username: 'admin',
        secret: 'admin'
    );

    $reflection = new ReflectionClass($service);
    $method = $reflection->getMethod('generateChannelId');
    $method->setAccessible(true);

    $channelId1 = $method->invoke($service);
    $channelId2 = $method->invoke($service);

    expect($channelId1)->toBeString()
        ->and($channelId1)->not->toEqual($channelId2);
});
