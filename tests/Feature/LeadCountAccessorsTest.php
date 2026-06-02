<?php

use App\Models\Lead;
use App\Models\LeadSource;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('active_leads_count counts every lead that is not won or lost', function () {
    $source = LeadSource::factory()->create();

    foreach (['new', 'contacted', 'qualified', 'proposal', 'nurturing'] as $status) {
        Lead::factory()->create([
            'lead_source_id' => $source->id,
            'inquiry_status' => $status,
            'phone' => '1234567890',
        ]);
    }
    Lead::factory()->create(['lead_source_id' => $source->id, 'inquiry_status' => 'won', 'phone' => '1234567890']);
    Lead::factory()->create(['lead_source_id' => $source->id, 'inquiry_status' => 'lost', 'phone' => '1234567890']);

    expect($source->active_leads_count)->toBe(5)
        ->and($source->leads_count)->toBe(7);
});

test('active_leads_count is zero when every lead is closed', function () {
    $source = LeadSource::factory()->create();
    Lead::factory()->create(['lead_source_id' => $source->id, 'inquiry_status' => 'won', 'phone' => '1234567890']);
    Lead::factory()->create(['lead_source_id' => $source->id, 'inquiry_status' => 'lost', 'phone' => '1234567890']);

    expect($source->active_leads_count)->toBe(0);
});

test('setPhoneAttribute strips junk characters', function () {
    $lead = Lead::factory()->create(['phone' => 'abc+1 (234) 567-890xyz']);

    expect($lead->fresh()->phone)->toBe('+1 (234) 567-890');
});

test('setPhoneAttribute handles a null phone without raising a deprecation', function () {
    $lead = new Lead;
    $lead->phone = null;

    expect($lead->phone)->toBeNull();
});
