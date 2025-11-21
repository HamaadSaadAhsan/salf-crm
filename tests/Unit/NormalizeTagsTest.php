<?php

use App\Http\Controllers\Leads\LeadController;

it('normalizes mixed tag payloads into canonical objects', function () {
    $controller = app(LeadController::class);

    // Use reflection to access the private normalizeTags method
    $reflection = new ReflectionClass($controller);
    $method = $reflection->getMethod('normalizeTags');
    $method->setAccessible(true);

    $input = [
        ['color' => 'yellow', 'label' => 'Potential', 'value' => 'potential'],
        'long followup',
        null,
        '',
        '  ',
        ['label' => '  Custom  Label  '],
        ['value' => 'Custom Label'],
        ['value' => 'POTENTIAL', 'color' => 'red'], // duplicate value, different case and color should be deduped by value
    ];

    /** @var array $normalized */
    $normalized = $method->invoke($controller, $input);

    // Should contain unique values by slug
    $values = array_map(fn ($t) => $t['value'], $normalized);

    expect($values)
        ->toContain('potential')
        ->toContain('long-followup')
        ->toContain('custom-label');

    // The first occurrence of a given value should be kept (color from the first one)
    $potential = collect($normalized)->firstWhere('value', 'potential');
    expect($potential)
        ->toBeArray()
        ->and($potential['label'])->toBe('Potential')
        ->and($potential['color'])->toBe('yellow');

    // String entry should become gray by default with title-cased label
    $lf = collect($normalized)->firstWhere('value', 'long-followup');
    expect($lf)
        ->toBeArray()
        ->and($lf['label'])->toBe('Long Followup')
        ->and($lf['color'])->toBe('gray');

    // Entries with only label or value should be accepted and normalized
    $custom = collect($normalized)->firstWhere('value', 'custom-label');
    expect($custom)
        ->toBeArray()
        ->and($custom['label'])->toBe('Custom Label')
        ->and($custom['color'])->toBe('gray');

    // Ensure there are exactly 3 unique tags after normalization
    expect(count($normalized))->toBe(3);
});
