<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;

uses()->group('lead', 'activity', 'custom-fields');

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('formats custom fields in activity description as human-readable text', function () {
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
        ->where('subject', 'Updated Custom Fields')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();

    // Verify the description contains formatted field names (Title Case)
    expect($activity->description)
        ->toContain('Family Size:')
        ->toContain('Children Ages:')
        ->toContain('Current Citizenships:')
        ->toContain('Investment Experience:')
        ->toContain('Urgency:');

    // Verify the description does NOT contain raw JSON
    expect($activity->description)
        ->not->toContain('{')
        ->not->toContain('}')
        ->not->toContain('["')
        ->not->toContain('"]');
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
        ->where('subject', 'Updated Custom Fields')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->description)->toContain('USA, Canada, UK');
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
        ->where('subject', 'Updated Custom Fields')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();

    // Check the new value in the description
    expect($activity->description)->toContain('Yes');
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
        ->where('subject', 'Updated Custom Fields')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->description)->toContain('Not set');
});

it('converts snake_case field names to Title Case in activity description', function () {
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
        ->where('subject', 'Updated Custom Fields')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->description)->toContain('Investment Amount Usd:');
});

it('stores metadata with field change information', function () {
    $oldCustomFields = [
        'family_size' => 3,
        'urgency' => 'low',
    ];

    $newCustomFields = [
        'family_size' => 4,
        'urgency' => 'high',
    ];

    $lead = Lead::factory()->create([
        'custom_fields' => $oldCustomFields,
    ]);

    $lead->update([
        'custom_fields' => $newCustomFields,
    ]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('subject', 'Updated Custom Fields')
        ->latest()
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->metadata)
        ->toHaveKey('field', 'custom_fields')
        ->toHaveKey('change_type', 'field_update')
        ->toHaveKey('old_value')
        ->toHaveKey('new_value');
});
