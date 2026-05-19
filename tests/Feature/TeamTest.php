<?php

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use App\Models\Task;
use App\Models\Team;
use App\Models\TeamInvitation;
use App\Models\User;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

function makeSuperAdmin(): User
{
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    return User::factory()->create()->assignRole('super-admin');
}

// ─── HasTeams trait ──────────────────────────────────────────────────────────

test('user can create a personal team', function () {
    $user = User::factory()->create();

    $team = $user->createPersonalTeam();

    expect($team->personal_team)->toBeTrue()
        ->and($team->user_id)->toEqual($user->id)
        ->and($user->fresh()->current_team_id)->toEqual($team->id);
});

test('user can switch to a team they belong to', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $member = User::factory()->create();
    $team->members()->attach($member, ['role' => 'member']);

    $switched = $member->switchTeam($team);

    expect($switched)->toBeTrue()
        ->and($member->fresh()->current_team_id)->toEqual($team->id);
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

    // Owner now has: personal team (auto-created by factory) + ownedTeam + memberTeam = 3
    expect($all->count())->toBeGreaterThanOrEqual(2)
        ->and($all->pluck('id'))->toContain($ownedTeam->id, $memberTeam->id);
});

// ─── Team creation ───────────────────────────────────────────────────────────

test('super admin can create a team', function () {
    $user = makeSuperAdmin();

    $this->actingAs($user)
        ->post('/teams', ['name' => 'Sales Team'])
        ->assertRedirect();

    expect($user->ownedTeams()->where('name', 'Sales Team')->exists())->toBeTrue();
});

test('regular user cannot create a team', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post('/teams', ['name' => 'Sales Team'])
        ->assertForbidden();
});

test('team name is required', function () {
    $user = makeSuperAdmin();

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

    expect($owner->fresh()->current_team_id)->toEqual($team->id);
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

test('super admin can add a member by email', function () {
    $owner = makeSuperAdmin();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $newMember = User::factory()->create();

    $this->actingAs($owner)
        ->post("/teams/{$team->id}/members", ['email' => $newMember->email, 'role' => 'member'])
        ->assertRedirect();

    expect($team->members()->where('user_id', $newMember->id)->exists())->toBeTrue();
});

test('non-super-admin cannot add members', function () {
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

test('super admin can send an invitation', function () {
    Role::firstOrCreate(['name' => 'sales-rep', 'guard_name' => 'web']);
    $owner = makeSuperAdmin();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);

    $this->actingAs($owner)
        ->post("/teams/{$team->id}/invitations", [
            'email' => 'new@example.com',
            'role' => 'member',
            'system_role' => 'sales-rep',
        ])
        ->assertRedirect();

    expect($team->invitations()->where('email', 'new@example.com')->exists())->toBeTrue();
});

test('non-super-admin cannot send invitations', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);

    $this->actingAs($owner)
        ->post("/teams/{$team->id}/invitations", [
            'email' => 'new@example.com',
            'role' => 'member',
            'system_role' => 'sales-rep',
        ])
        ->assertForbidden();
});

test('invited user can register via invitation token', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $token = Str::random(64);

    TeamInvitation::create([
        'team_id' => $team->id,
        'email' => 'newuser@example.com',
        'token' => $token,
        'role' => 'member',
    ]);

    $this->post("/invitations/{$token}", [
        'name' => 'New User',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertRedirect();

    $newUser = User::where('email', 'newuser@example.com')->first();
    expect($newUser)->not->toBeNull()
        ->and($team->members()->where('user_id', $newUser->id)->exists())->toBeTrue()
        ->and(TeamInvitation::where('token', $token)->exists())->toBeFalse();
});

test('invitation show redirects existing user to login', function () {
    $owner = User::factory()->create();
    $team = Team::create(['user_id' => $owner->id, 'name' => 'Alpha', 'personal_team' => false]);
    $existing = User::factory()->create(['email' => 'exists@example.com']);
    $token = Str::random(64);

    TeamInvitation::create([
        'team_id' => $team->id,
        'email' => 'exists@example.com',
        'token' => $token,
        'role' => 'member',
    ]);

    $this->get("/invitations/{$token}")->assertRedirect('/login');
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

    $this->actingAs($ownerA);
    Task::create([
        'title' => 'Task A',
        'status' => TaskStatus::PENDING,
        'priority' => TaskPriority::MEDIUM,
        'type' => TaskType::OTHER,
        'assigned_to_id' => $ownerA->id,
        'created_by_id' => $ownerA->id,
        'team_id' => $teamA->id,
    ]);

    $this->actingAs($ownerB);
    Task::create([
        'title' => 'Task B',
        'status' => TaskStatus::PENDING,
        'priority' => TaskPriority::MEDIUM,
        'type' => TaskType::OTHER,
        'assigned_to_id' => $ownerB->id,
        'created_by_id' => $ownerB->id,
        'team_id' => $teamB->id,
    ]);

    $this->actingAs($ownerB);
    $tasks = Task::all();
    expect($tasks->pluck('title')->toArray())->toEqual(['Task B']);
});
