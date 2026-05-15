<?php

use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;

// ─── HasTeams trait ──────────────────────────────────────────────────────────

test('user can create a personal team', function () {
    $user = User::factory()->create();

    $team = $user->createPersonalTeam();

    expect($team->personal_team)->toBeTrue()
        ->and($team->user_id)->toBe($user->id)
        ->and($user->fresh()->current_team_id)->toBe($team->id);
});

test('user can switch to a team they belong to', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $member = User::factory()->create();
    $team->members()->attach($member, ['role' => 'member']);

    $switched = $member->switchTeam($team);

    expect($switched)->toBeTrue()
        ->and($member->fresh()->current_team_id)->toBe($team->id);
});

test('user cannot switch to a team they do not belong to', function () {
    $user = User::factory()->create();
    $other = Team::create(['user_id' => User::factory()->create()->id, 'name' => 'Beta', 'personal_team' => false]);

    expect($user->switchTeam($other))->toBeFalse();
});

test('allTeams returns owned and member teams', function () {
    $owner = User::factory()->create();
    $ownedTeam = Team::create(['user_id' => $owner->id, 'name' => 'Owned', 'personal_team' => false]);

    $other = User::factory()->create();
    $memberTeam = Team::create(['user_id' => $other->id, 'name' => 'Member', 'personal_team' => false]);
    $memberTeam->members()->attach($owner, ['role' => 'member']);

    $all = $owner->allTeams();

    expect($all)->toHaveCount(2)
        ->and($all->pluck('id'))->toContain($ownedTeam->id, $memberTeam->id);
});

// ─── Team creation ───────────────────────────────────────────────────────────

test('authenticated user can create a team', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/teams', ['name' => 'Sales Team'])
        ->assertRedirect();

    expect($user->ownedTeams()->where('name', 'Sales Team')->exists())->toBeTrue();
});

test('team name is required', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/teams', ['name' => ''])
        ->assertSessionHasErrors('name');
});

test('guests cannot create a team', function () {
    $this->post('/teams', ['name' => 'Hack'])->assertRedirect('/login');
});

// ─── Current team switching ───────────────────────────────────────────────────

test('owner can switch current team', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);

    $this->actingAs($owner)
        ->put('/current-team', ['team_id' => $team->id])
        ->assertRedirect();

    expect($owner->fresh()->current_team_id)->toBe($team->id);
});

test('user cannot switch to a foreign team', function () {
    $user = User::factory()->create();
    $stranger = User::factory()->create();
    $team = Team::create(['user_id' => $stranger->id, 'name' => 'Foreign', 'personal_team' => false]);

    $this->actingAs($user)
        ->put('/current-team', ['team_id' => $team->id])
        ->assertForbidden();
});

// ─── Team members ─────────────────────────────────────────────────────────────

test('owner can add a member by email', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $newMember = User::factory()->create();

    $this->actingAs($owner)
        ->post("/teams/{$team->id}/members", ['email' => $newMember->email, 'role' => 'member'])
        ->assertRedirect();

    expect($team->members()->where('user_id', $newMember->id)->exists())->toBeTrue();
});

test('non-owner cannot add members', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $member = User::factory()->create();
    $team->members()->attach($member, ['role' => 'member']);
    $stranger = User::factory()->create();

    $this->actingAs($member)
        ->post("/teams/{$team->id}/members", ['email' => $stranger->email, 'role' => 'member'])
        ->assertForbidden();
});

test('owner can remove a member', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $member = User::factory()->create();
    $team->members()->attach($member, ['role' => 'member']);

    $this->actingAs($owner)
        ->delete("/teams/{$team->id}/members/{$member->id}")
        ->assertRedirect();

    expect($team->members()->where('user_id', $member->id)->exists())->toBeFalse();
});

// ─── Team invitations ─────────────────────────────────────────────────────────

test('owner can send an invitation', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);

    $this->actingAs($owner)
        ->post("/teams/{$team->id}/invitations", ['email' => 'new@example.com', 'role' => 'member'])
        ->assertRedirect();

    expect($team->invitations()->where('email', 'new@example.com')->exists())->toBeTrue();
});

test('invited user can accept an invitation', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $invitee = User::factory()->create();
    $invitation = TeamInvitation::create(['team_id' => $team->id, 'email' => $invitee->email, 'role' => 'member']);

    $this->actingAs($invitee)
        ->get("/team-invitations/{$invitation->id}/accept")
        ->assertRedirect();

    expect($team->members()->where('user_id', $invitee->id)->exists())->toBeTrue()
        ->and(TeamInvitation::find($invitation->id))->toBeNull();
});

test('wrong user cannot accept another users invitation', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $invitee = User::factory()->create();
    $impostor = User::factory()->create();
    $invitation = TeamInvitation::create(['team_id' => $team->id, 'email' => $invitee->email, 'role' => 'member']);

    $this->actingAs($impostor)
        ->get("/team-invitations/{$invitation->id}/accept")
        ->assertForbidden();
});

// ─── Team deletion ────────────────────────────────────────────────────────────

test('owner can delete a non-personal team', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);

    $this->actingAs($owner)
        ->delete("/teams/{$team->id}")
        ->assertRedirect();

    expect(Team::find($team->id))->toBeNull();
});

test('personal team cannot be deleted', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Personal', 'personal_team' => true]);

    $this->actingAs($owner)
        ->delete("/teams/{$team->id}")
        ->assertForbidden();
});

// ─── BelongsToTeam global scope ───────────────────────────────────────────────

test('BelongsToTeam scope isolates team data', function () {
    $ownerA = User::factory()->create();
    $teamA = Team::create(['user_id' => $ownerA->id, 'name' => 'A', 'personal_team' => false]);
    $ownerA->forceFill(['current_team_id' => $teamA->id])->save();

    $ownerB = User::factory()->create();
    $teamB = Team::create(['user_id' => $ownerB->id, 'name' => 'B', 'personal_team' => false]);
    $ownerB->forceFill(['current_team_id' => $teamB->id])->save();

    // Create tasks in each team context
    $this->actingAs($ownerA);
    \App\Models\Task::create([
        'title' => 'Task A',
        'status' => \App\Enums\TaskStatus::PENDING,
        'priority' => \App\Enums\TaskPriority::MEDIUM,
        'type' => \App\Enums\TaskType::OTHER,
        'assigned_to_id' => $ownerA->id,
        'created_by_id' => $ownerA->id,
        'team_id' => $teamA->id,
    ]);

    $this->actingAs($ownerB);
    \App\Models\Task::create([
        'title' => 'Task B',
        'status' => \App\Enums\TaskStatus::PENDING,
        'priority' => \App\Enums\TaskPriority::MEDIUM,
        'type' => \App\Enums\TaskType::OTHER,
        'assigned_to_id' => $ownerB->id,
        'created_by_id' => $ownerB->id,
        'team_id' => $teamB->id,
    ]);

    // User B should only see Task B
    $this->actingAs($ownerB);
    $tasks = \App\Models\Task::all();
    expect($tasks->pluck('title')->toArray())->toEqual(['Task B']);
});
