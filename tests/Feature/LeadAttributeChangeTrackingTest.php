<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;

uses()->group('lead', 'activity', 'attribute-change');

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('batches multiple field changes into a single attribute_change activity', function () {
    $lead = Lead::factory()->create([
        'name' => 'Old Name',
        'city' => 'Old City',
        'budget' => 1000,
    ]);

    $lead->update([
        'name' => 'New Name',
        'city' => 'New City',
        'budget' => 2000,
    ]);

    $activities = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->get();

    expect($activities)->toHaveCount(1);

    $activity = $activities->first();
    expect($activity->subject)->toBe('Changed 3 attributes');
    expect($activity->category)->toBe('system');
    expect($activity->status)->toBe('completed');
    expect($activity->metadata['change_type'])->toBe('attribute_change');
    expect($activity->metadata['changes'])->toHaveCount(3);
});

it('creates single attribute_change with descriptive subject for one field', function () {
    $lead = Lead::factory()->create(['city' => 'Old City']);

    $lead->update(['city' => 'New City']);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->first();

    expect($activity)->not->toBeNull();
    expect($activity->subject)->toBe('Updated City');
    expect($activity->metadata['changes'])->toHaveCount(1);
    expect($activity->metadata['changes'][0])
        ->toHaveKey('field', 'city')
        ->toHaveKey('field_name', 'City')
        ->toHaveKey('old_value', 'Old City')
        ->toHaveKey('new_value', 'New City');
});

it('still creates separate status_change activity for inquiry_status', function () {
    $lead = Lead::factory()->create(['inquiry_status' => 'new']);

    $lead->update(['inquiry_status' => 'contacted']);

    $statusActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'status_change')
        ->first();

    $attributeActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->first();

    expect($statusActivity)->not->toBeNull();
    expect($attributeActivity)->toBeNull();
});

it('still creates separate assignment_change activity for assigned_to', function () {
    $newUser = User::factory()->create();
    $lead = Lead::factory()->create(['assigned_to' => $this->user->id]);

    $lead->update(['assigned_to' => $newUser->id]);

    $assignmentActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'assignment_change')
        ->first();

    $attributeActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->first();

    expect($assignmentActivity)->not->toBeNull();
    expect($attributeActivity)->toBeNull();
});

it('handles mixed special and regular field changes correctly', function () {
    $lead = Lead::factory()->create([
        'name' => 'Old Name',
        'city' => 'Old City',
        'inquiry_status' => 'new',
    ]);

    $lead->update([
        'name' => 'New Name',
        'city' => 'New City',
        'inquiry_status' => 'contacted',
    ]);

    // Should have one status_change and one attribute_change
    $statusActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'status_change')
        ->first();

    $attributeActivity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->first();

    expect($statusActivity)->not->toBeNull();
    expect($attributeActivity)->not->toBeNull();
    expect($attributeActivity->subject)->toBe('Changed 2 attributes');
    expect($attributeActivity->metadata['changes'])->toHaveCount(2);
});

it('does not create activity for skipped fields', function () {
    $lead = Lead::factory()->create();

    $lead->update(['lead_score' => 99]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->first();

    expect($activity)->toBeNull();
});

it('stores old and new values correctly in metadata', function () {
    $lead = Lead::factory()->create([
        'name' => 'John Doe',
        'email' => 'john@example.com',
    ]);

    $lead->update([
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
    ]);

    $activity = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->first();

    $changes = collect($activity->metadata['changes']);

    $nameChange = $changes->firstWhere('field', 'name');
    expect($nameChange['old_value'])->toBe('John Doe');
    expect($nameChange['new_value'])->toBe('Jane Doe');

    $emailChange = $changes->firstWhere('field', 'email');
    expect($emailChange['old_value'])->toBe('john@example.com');
    expect($emailChange['new_value'])->toBe('jane@example.com');
});

it('merges sequential field updates within 60 seconds into a single activity', function () {
    $lead = Lead::factory()->create([
        'name' => 'Old Name',
        'city' => 'Old City',
        'country' => 'US',
    ]);

    // First update - city
    $lead->update(['city' => 'New City']);
    $lead->refresh();

    // Second update - country (within 60s window)
    $lead->update(['country' => 'UK']);
    $lead->refresh();

    // Third update - name (within 60s window)
    $lead->update(['name' => 'New Name']);

    $activities = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->get();

    expect($activities)->toHaveCount(1);

    $activity = $activities->first();
    expect($activity->subject)->toBe('Changed 3 attributes');
    expect($activity->metadata['changes'])->toHaveCount(3);

    $fields = collect($activity->metadata['changes'])->pluck('field')->all();
    expect($fields)->toContain('city');
    expect($fields)->toContain('country');
    expect($fields)->toContain('name');
});

it('replaces previous value when same field is updated again within window', function () {
    $lead = Lead::factory()->create(['city' => 'Original City']);

    $lead->update(['city' => 'Intermediate City']);
    $lead->refresh();
    $lead->update(['city' => 'Final City']);

    $activities = LeadActivity::where('lead_id', $lead->id)
        ->where('type', 'attribute_change')
        ->get();

    expect($activities)->toHaveCount(1);

    $change = $activities->first()->metadata['changes'][0];
    expect($change['new_value'])->toBe('Final City');
});
