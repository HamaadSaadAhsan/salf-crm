<?php

use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;

beforeEach(function () {
    config(['broadcasting.default' => 'null']);
});

it('returns the base score of 50 when no bonus fields are present', function () {
    $lead = Lead::factory()->make([
        'email' => null,
        'phone' => null,
        'occupation' => null,
        'lead_source_id' => null,
        'budget' => null,
    ]);

    expect(Lead::calculateInitialScore($lead))->toBe(50);
});

it('adds 10 for a business email (non-gmail)', function () {
    $lead = Lead::factory()->make([
        'email' => 'ceo@acme-corp.com',
        'phone' => null,
        'occupation' => null,
        'lead_source_id' => null,
        'budget' => null,
    ]);

    expect(Lead::calculateInitialScore($lead))->toBe(60);
});

it('does not add a bonus for a gmail email', function () {
    $lead = Lead::factory()->make([
        'email' => 'someone@gmail.com',
        'phone' => null,
        'occupation' => null,
        'lead_source_id' => null,
        'budget' => null,
    ]);

    expect(Lead::calculateInitialScore($lead))->toBe(50);
});

it('adds 10 when a phone number is present', function () {
    $lead = Lead::factory()->make([
        'email' => null,
        'phone' => '+1234567890',
        'occupation' => null,
        'lead_source_id' => null,
        'budget' => null,
    ]);

    expect(Lead::calculateInitialScore($lead))->toBe(60);
});

it('adds 10 for qualifying occupations', function (string $occupation) {
    $lead = Lead::factory()->make([
        'email' => null,
        'phone' => null,
        'occupation' => $occupation,
        'lead_source_id' => null,
        'budget' => null,
    ]);

    expect(Lead::calculateInitialScore($lead))->toBe(60);
})->with(['CEO', 'cto', 'Manager', 'director']);

it('does not add a bonus for non-qualifying occupations', function () {
    $lead = Lead::factory()->make([
        'email' => null,
        'phone' => null,
        'occupation' => 'Intern',
        'lead_source_id' => null,
        'budget' => null,
    ]);

    expect(Lead::calculateInitialScore($lead))->toBe(50);
});

it('adds 10 when budget amount is greater than zero', function () {
    $lead = Lead::factory()->make([
        'email' => null,
        'phone' => null,
        'occupation' => null,
        'lead_source_id' => null,
        'budget' => ['amount' => 5000, 'currency' => 'USD'],
    ]);

    expect(Lead::calculateInitialScore($lead))->toBe(60);
});

it('does not add a budget bonus when the amount is zero', function () {
    $lead = Lead::factory()->make([
        'email' => null,
        'phone' => null,
        'occupation' => null,
        'lead_source_id' => null,
        'budget' => ['amount' => 0, 'currency' => 'USD'],
    ]);

    expect(Lead::calculateInitialScore($lead))->toBe(50);
});

it('caps the lead score at 100 after activity-based bonuses', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $lead = Lead::factory()->create([
        'email' => 'ceo@acme-corp.com',
        'phone' => '+1234567890',
        'occupation' => 'CEO',
        'budget' => ['amount' => 5000, 'currency' => 'USD'],
        'lead_source_id' => null,
    ]);

    // 5 recent activities -> +25, capped at +20.
    // Initial score: 50 + 10(email) + 10(phone) + 10(occupation) + 10(budget) = 90.
    // 90 + 20 = 110 -> capped at 100.
    LeadActivity::factory()->count(5)->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'created_at' => now()->subDays(1),
    ]);

    $lead->refresh();
    $lead->updateScore();

    expect($lead->fresh()->lead_score)->toBe(100);
});

it('flags a lead as hot when score is at least 80', function () {
    $lead = Lead::factory()->create([
        'lead_score' => 80,
        'priority' => 'low',
        'inquiry_status' => 'nurturing',
    ]);

    expect($lead->is_hot_lead)->toBeTrue();
});

it('flags a lead as hot when priority is high and status is new', function () {
    $lead = Lead::factory()->create([
        'lead_score' => 10,
        'priority' => 'high',
        'inquiry_status' => 'new',
    ]);

    expect($lead->is_hot_lead)->toBeTrue();
});

it('flags a lead as hot when priority is high and status is contacted', function () {
    $lead = Lead::factory()->create([
        'lead_score' => 10,
        'priority' => 'high',
        'inquiry_status' => 'contacted',
    ]);

    expect($lead->is_hot_lead)->toBeTrue();
});

it('does not flag a lead as hot when priority is medium and score is below 80', function () {
    $lead = Lead::factory()->create([
        'lead_score' => 50,
        'priority' => 'medium',
        'inquiry_status' => 'new',
    ]);

    expect($lead->is_hot_lead)->toBeFalse();
});

it('adds 5 points per recent activity in updateScore capped at 20', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    // Build a lead whose base score is 50 (no bonus fields) so we can isolate
    // the activity contribution. lead_source_id is nulled out to avoid the
    // factory selecting a random source.
    $lead = Lead::factory()->create([
        'email' => null,
        'phone' => null,
        'occupation' => null,
        'lead_source_id' => null,
        'budget' => null,
    ]);

    // 2 recent activities -> +10. Older activities are ignored.
    LeadActivity::factory()->count(2)->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'created_at' => now()->subDays(2),
    ]);

    LeadActivity::factory()->count(3)->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'created_at' => now()->subDays(30),
    ]);

    $lead->updateScore();

    expect($lead->fresh()->lead_score)->toBe(60);

    // Add enough recent activities so the bonus exceeds the cap of +20.
    LeadActivity::factory()->count(6)->create([
        'lead_id' => $lead->id,
        'user_id' => $user->id,
        'created_at' => now()->subDays(1),
    ]);

    $lead->updateScore();

    // Base 50 + 8 recent activities (2 + 6) * 5 = 40, capped at +20 -> 70.
    expect($lead->fresh()->lead_score)->toBe(70);
});
