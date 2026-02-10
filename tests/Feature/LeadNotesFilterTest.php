<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    $this->user = User::factory()->create(['email_verified_at' => now()]);
    $this->user->assignRole('super-admin');
    $this->lead = Lead::factory()->create(['inquiry_status' => 'contacted']);
    $this->actingAs($this->user);
});

it('returns user-created notes in the notes endpoint', function () {
    LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $this->user->id,
        'type' => 'note',
        'status' => 'completed',
        'subject' => 'User note',
        'description' => 'A note written by a user',
        'completed_at' => now(),
    ]);

    $response = $this->getJson('/lead-activities?'.http_build_query([
        'lead_id' => $this->lead->id,
        'type' => 'note,call',
        'exclude_system' => 1,
        'per_page' => 12,
    ]));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.subject'))->toBe('User note');
});

it('returns call notes in the notes endpoint', function () {
    LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $this->user->id,
        'type' => 'call',
        'status' => 'completed',
        'subject' => 'Inbound call',
        'notes' => 'Discussed pricing with client',
        'completed_at' => now(),
    ]);

    $response = $this->getJson('/lead-activities?'.http_build_query([
        'lead_id' => $this->lead->id,
        'type' => 'note,call',
        'exclude_system' => 1,
        'per_page' => 12,
    ]));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.type'))->toBe('call');
});

it('excludes system-generated activities from notes', function () {
    // System-generated note (from observer)
    LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $this->user->id,
        'type' => 'note',
        'status' => 'completed',
        'subject' => 'Updated Priority',
        'description' => 'Priority was changed from Low to High.',
        'completed_at' => now(),
        'category' => 'system',
    ]);

    // Tag change activity
    LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $this->user->id,
        'type' => 'note',
        'status' => 'completed',
        'subject' => 'Added tags',
        'description' => 'Added tags: VIP',
        'completed_at' => now(),
        'category' => 'tag_change',
    ]);

    // User-created note (no category)
    LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $this->user->id,
        'type' => 'note',
        'status' => 'completed',
        'subject' => 'My personal note',
        'description' => 'Client prefers email contact',
        'completed_at' => now(),
    ]);

    $response = $this->getJson('/lead-activities?'.http_build_query([
        'lead_id' => $this->lead->id,
        'type' => 'note,call',
        'exclude_system' => 1,
        'per_page' => 12,
    ]));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.subject'))->toBe('My personal note');
});

it('includes all activities when exclude_system is not set', function () {
    LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $this->user->id,
        'type' => 'note',
        'status' => 'completed',
        'subject' => 'System note',
        'completed_at' => now(),
        'category' => 'system',
    ]);

    LeadActivity::create([
        'lead_id' => $this->lead->id,
        'user_id' => $this->user->id,
        'type' => 'note',
        'status' => 'completed',
        'subject' => 'User note',
        'completed_at' => now(),
    ]);

    $response = $this->getJson('/lead-activities?'.http_build_query([
        'lead_id' => $this->lead->id,
        'type' => 'note',
        'per_page' => 12,
    ]));

    $response->assertOk();
    expect($response->json('data'))->toHaveCount(2);
});
