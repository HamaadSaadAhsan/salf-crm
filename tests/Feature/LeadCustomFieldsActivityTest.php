<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;

uses()->group('lead', 'activity', 'custom-fields');

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('formats custom fields in activity metadata as human-readable text', function () {
    $lead = Lead::factory()->create([
        'custom_fields' => [
            'family_size' => 5,
            'children_ages' => '10, 0, 17',
            'current_citizenships' => ['GB'],
            'investment_experience' => 'expert',
            'urgency' => 'high',
        ],
    ]);

    // Update custom fields
    $lead->update([
        'custom_fields' => [
            'family_size' => 6,
            'children_ages' => '10, 0, 17, 2',
            'current_citizenships' => ['GB', 'US'],
            'investment_experience' => 'beginner',
            'urgency' => 'medium',
        ],
    ]);

    // Get the activity created by the observer
    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->subject)->toBe('Updated Custom Fields');

    // Verify the metadata contains the changes
    $changes = $activity->metadata['changes'];
    expect($changes)->toHaveCount(1);
    expect($changes[0]['field'])->toBe('custom_fields');

    // Verify formatted values contain Title Case field names
    $newValue = $changes[0]['new_value'];
    expect($newValue)
        ->toContain('Family Size:')
        ->toContain('Children Ages:')
        ->toContain('Current Citizenships:')
        ->toContain('Investment Experience:')
        ->toContain('Urgency:');
});

it('formats array values in custom fields as comma-separated strings', function () {
    $lead = Lead::factory()->create([
        'custom_fields' => [
            'preferred_countries' => ['USA', 'Canada'],
        ],
    ]);

    $lead->update([
        'custom_fields' => [
            'preferred_countries' => ['USA', 'Canada', 'UK'],
        ],
    ]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();

    $changes = $activity->metadata['changes'];
    expect($changes[0]['new_value'])->toContain('USA, Canada, UK');
});

it('formats boolean values in custom fields as Yes/No', function () {
    $lead = Lead::factory()->create([
        'custom_fields' => [
            'has_passport' => false,
        ],
    ]);

    $lead->update([
        'custom_fields' => [
            'has_passport' => true,
        ],
    ]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->metadata['changes'][0]['new_value'])->toContain('Yes');
});

it('handles null values in custom fields', function () {
    $lead = Lead::factory()->create([
        'custom_fields' => [
            'notes' => 'Some notes',
        ],
    ]);

    $lead->update([
        'custom_fields' => [
            'notes' => null,
        ],
    ]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->metadata['changes'][0]['new_value'])->toContain('Not set');
});

it('converts snake_case field names to Title Case in activity metadata', function () {
    $lead = Lead::factory()->create([
        'custom_fields' => [
            'investment_amount_usd' => 100000,
        ],
    ]);

    $lead->update([
        'custom_fields' => [
            'investment_amount_usd' => 150000,
        ],
    ]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->metadata['changes'][0]['new_value'])->toContain('Investment Amount Usd:');
});

it('stores metadata with batched change information', function () {
    $lead = Lead::factory()->create([
        'custom_fields' => [
            'family_size' => 3,
            'urgency' => 'low',
        ],
    ]);

    $lead->update([
        'custom_fields' => [
            'family_size' => 4,
            'urgency' => 'high',
        ],
    ]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->metadata)
        ->toHaveKey('changes')
        ->toHaveKey('change_type', 'attribute_change');
    expect($activity->metadata['changes'][0])
        ->toHaveKey('field', 'custom_fields')
        ->toHaveKey('field_name', 'Custom Fields')
        ->toHaveKey('old_value')
        ->toHaveKey('new_value');
});
