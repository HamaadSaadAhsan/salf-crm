<?php

use App\Models\Lead;
use App\Models\Team;
use App\Models\User;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

beforeEach(function () {
    config(['broadcasting.default' => 'null']);
});

it('auto-assigns team_id from the authenticated user current team on creation', function () {
    $owner = User::factory()->create(['email_verified_at' => now()]);
    $team = Team::create([
        'user_id' => $owner->id,
        'name' => 'Alpha',
        'personal_team' => false,
    ]);
    $owner->forceFill(['current_team_id' => $team->id])->save();

    actingAs($owner);

    $lead = Lead::factory()->create();

    expect($lead->fresh()->team_id)->toEqual($team->id);
});

it('restricts queries to leads belonging to the authenticated user current team', function () {
    $ownerA = User::factory()->create(['email_verified_at' => now()]);
    $teamA = Team::create([
        'user_id' => $ownerA->id,
        'name' => 'Alpha',
        'personal_team' => false,
    ]);
    $ownerA->forceFill(['current_team_id' => $teamA->id])->save();

    $ownerB = User::factory()->create(['email_verified_at' => now()]);
    $teamB = Team::create([
        'user_id' => $ownerB->id,
        'name' => 'Beta',
        'personal_team' => false,
    ]);
    $ownerB->forceFill(['current_team_id' => $teamB->id])->save();

    actingAs($ownerA);
    $leadA = Lead::factory()->create(['name' => 'Lead A']);

    actingAs($ownerB);
    $leadB = Lead::factory()->create(['name' => 'Lead B']);

    actingAs($ownerA);
    $visible = Lead::all();

    expect($visible->pluck('id')->all())->toEqual([$leadA->id])
        ->and($visible->pluck('id')->all())->not->toContain($leadB->id);
});

it('exposes leads with a null team_id to every team (shared data)', function () {
    $ownerA = User::factory()->create(['email_verified_at' => now()]);
    $teamA = Team::create([
        'user_id' => $ownerA->id,
        'name' => 'Alpha',
        'personal_team' => false,
    ]);
    $ownerA->forceFill(['current_team_id' => $teamA->id])->save();

    // Create a shared lead with no team. We can't rely on the auto-assigning
    // creator hook, so we forcibly null it after creation.
    actingAs($ownerA);
    $sharedLead = Lead::factory()->create();
    $sharedLead->forceFill(['team_id' => null])->save();

    actingAs($ownerA);
    $visibleIds = Lead::query()->pluck('id')->all();

    expect($visibleIds)->toContain($sharedLead->id);

    // The shared lead must also be visible to a different team.
    $ownerB = User::factory()->create(['email_verified_at' => now()]);
    $teamB = Team::create([
        'user_id' => $ownerB->id,
        'name' => 'Beta',
        'personal_team' => false,
    ]);
    $ownerB->forceFill(['current_team_id' => $teamB->id])->save();

    actingAs($ownerB);
    $visibleIdsForB = Lead::query()->pluck('id')->all();

    expect($visibleIdsForB)->toContain($sharedLead->id);
});

it('lets super-admin users bypass the team scope and see every team lead', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    $ownerA = User::factory()->create(['email_verified_at' => now()]);
    $teamA = Team::create([
        'user_id' => $ownerA->id,
        'name' => 'Alpha',
        'personal_team' => false,
    ]);
    $ownerA->forceFill(['current_team_id' => $teamA->id])->save();

    $ownerB = User::factory()->create(['email_verified_at' => now()]);
    $teamB = Team::create([
        'user_id' => $ownerB->id,
        'name' => 'Beta',
        'personal_team' => false,
    ]);
    $ownerB->forceFill(['current_team_id' => $teamB->id])->save();

    actingAs($ownerA);
    $leadA = Lead::factory()->create(['name' => 'Lead A']);

    actingAs($ownerB);
    $leadB = Lead::factory()->create(['name' => 'Lead B']);

    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('super-admin');
    $admin->forceFill(['current_team_id' => $teamA->id])->save();

    actingAs($admin);
    $visibleIds = Lead::query()->pluck('id')->all();

    expect($visibleIds)->toContain($leadA->id)
        ->and($visibleIds)->toContain($leadB->id);
});

it('changes which leads are visible when the user switches teams', function () {
    $user = User::factory()->create(['email_verified_at' => now()]);

    $teamA = Team::create([
        'user_id' => $user->id,
        'name' => 'Alpha',
        'personal_team' => false,
    ]);
    $teamB = Team::create([
        'user_id' => $user->id,
        'name' => 'Beta',
        'personal_team' => false,
    ]);

    // Create a lead inside team A.
    $user->forceFill(['current_team_id' => $teamA->id])->save();
    actingAs($user->fresh());
    $leadA = Lead::factory()->create(['name' => 'Lead A']);

    // Create a lead inside team B.
    $user->forceFill(['current_team_id' => $teamB->id])->save();
    actingAs($user->fresh());
    $leadB = Lead::factory()->create(['name' => 'Lead B']);

    // While the user is on team B, they should only see team B's leads.
    $visibleOnB = Lead::query()->pluck('id')->all();
    expect($visibleOnB)->toContain($leadB->id)
        ->and($visibleOnB)->not->toContain($leadA->id);

    // Switch back to team A and confirm only team A's leads are visible.
    $user->forceFill(['current_team_id' => $teamA->id])->save();
    actingAs($user->fresh());
    $visibleOnA = Lead::query()->pluck('id')->all();

    expect($visibleOnA)->toContain($leadA->id)
        ->and($visibleOnA)->not->toContain($leadB->id);
});

it('keeps a lead without a team_id visible to any authenticated team member', function () {
    $ownerA = User::factory()->create(['email_verified_at' => now()]);
    $teamA = Team::create([
        'user_id' => $ownerA->id,
        'name' => 'Alpha',
        'personal_team' => false,
    ]);
    $ownerA->forceFill(['current_team_id' => $teamA->id])->save();

    $ownerB = User::factory()->create(['email_verified_at' => now()]);
    $teamB = Team::create([
        'user_id' => $ownerB->id,
        'name' => 'Beta',
        'personal_team' => false,
    ]);
    $ownerB->forceFill(['current_team_id' => $teamB->id])->save();

    // Create a team-less lead by bypassing the creating hook.
    $sharedLead = Lead::factory()->create();
    $sharedLead->forceFill(['team_id' => null])->save();

    actingAs($ownerA);
    expect(Lead::query()->pluck('id')->all())->toContain($sharedLead->id);

    actingAs($ownerB);
    expect(Lead::query()->pluck('id')->all())->toContain($sharedLead->id);
});
