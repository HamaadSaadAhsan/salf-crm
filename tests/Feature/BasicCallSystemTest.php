<?php

it('has call system models', function () {
    expect(class_exists('App\Models\CallSession'))->toBeTrue();
    expect(class_exists('App\Models\SipAccount'))->toBeTrue();
    expect(class_exists('App\Models\CallLog'))->toBeTrue();
});

it('has call system services', function () {
    expect(class_exists('App\Services\AsteriskService'))->toBeTrue();
});

it('has call system jobs', function () {
    expect(class_exists('App\Jobs\ProcessCallInitiation'))->toBeTrue();
});

it('has call system events', function () {
    expect(class_exists('App\Events\CallInitiated'))->toBeTrue();
    expect(class_exists('App\Events\CallAnswered'))->toBeTrue();
    expect(class_exists('App\Events\CallEnded'))->toBeTrue();
});

it('has call system controllers', function () {
    expect(class_exists('App\Http\Controllers\CallController'))->toBeTrue();
    expect(class_exists('App\Http\Controllers\SipAccountController'))->toBeTrue();
});
