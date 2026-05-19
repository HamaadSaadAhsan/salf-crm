<?php

use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadForm;
use App\Models\Message;
use App\Models\MetaPage;
use App\Models\Team;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Workflow;
use App\Services\FacebookService;
use Spatie\Permission\Models\Role;

use function Pest\Laravel\actingAs;

beforeEach(function () {
    config(['broadcasting.default' => 'null']);
});

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Create a fresh user and team, attach the user to the team, set it current,
 * and act as the user.
 *
 * @return array{0: User, 1: Team}
 */
function makeTeamUser(string $teamName): array
{
    $user = User::factory()->create(['email_verified_at' => now()]);
    $team = Team::create([
        'user_id' => $user->id,
        'name' => $teamName,
        'personal_team' => false,
    ]);
    joinTeam($team, $user);

    return [$user, $team];
}

/*
|--------------------------------------------------------------------------
| CallSession scoping
|--------------------------------------------------------------------------
*/

it('auto-assigns team_id on CallSession creation from current_team_id', function () {
    [$user, $team] = makeTeamUser('Alpha');
    actingAs($user);

    $session = CallSession::factory()->create([
        'caller_id' => $user->id,
    ]);

    expect($session->fresh()->team_id)->toEqual($team->id);
});

it('restricts CallSession queries to the authenticated user current team', function () {
    [$userA, $teamA] = makeTeamUser('Alpha');
    [$userB, $teamB] = makeTeamUser('Beta');

    actingAs($userA);
    $sessionA = CallSession::factory()->create(['caller_id' => $userA->id]);

    actingAs($userB);
    $sessionB = CallSession::factory()->create(['caller_id' => $userB->id]);

    actingAs($userA);
    $visibleIds = CallSession::query()->pluck('id')->all();

    expect($visibleIds)->toContain($sessionA->id)
        ->and($visibleIds)->not->toContain($sessionB->id);
});

it('lets super-admin users see CallSessions across all teams', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    [$userA, $teamA] = makeTeamUser('Alpha');
    [$userB, $teamB] = makeTeamUser('Beta');

    actingAs($userA);
    $sessionA = CallSession::factory()->create(['caller_id' => $userA->id]);

    actingAs($userB);
    $sessionB = CallSession::factory()->create(['caller_id' => $userB->id]);

    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('super-admin');
    $admin->forceFill(['current_team_id' => $teamA->id])->save();

    actingAs($admin);
    $visibleIds = CallSession::query()->pluck('id')->all();

    expect($visibleIds)->toContain($sessionA->id)
        ->and($visibleIds)->toContain($sessionB->id);
});

/*
|--------------------------------------------------------------------------
| Workflow scoping
|--------------------------------------------------------------------------
*/

it('auto-assigns team_id on Workflow creation from current_team_id', function () {
    [$user, $team] = makeTeamUser('Alpha');
    actingAs($user);

    $workflow = Workflow::create([
        'name' => 'Onboarding',
        'description' => 'Test workflow',
        'status' => 'draft',
        'user_id' => $user->id,
    ]);

    expect($workflow->fresh()->team_id)->toEqual($team->id);
});

it('restricts Workflow queries to the authenticated user current team', function () {
    [$userA, $teamA] = makeTeamUser('Alpha');
    [$userB, $teamB] = makeTeamUser('Beta');

    actingAs($userA);
    $workflowA = Workflow::create([
        'name' => 'Workflow A',
        'status' => 'draft',
        'user_id' => $userA->id,
    ]);

    actingAs($userB);
    $workflowB = Workflow::create([
        'name' => 'Workflow B',
        'status' => 'draft',
        'user_id' => $userB->id,
    ]);

    actingAs($userA);
    $visibleIds = Workflow::query()->pluck('id')->all();

    expect($visibleIds)->toContain($workflowA->id)
        ->and($visibleIds)->not->toContain($workflowB->id);
});

it('lets super-admin users see Workflows across all teams', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    [$userA, $teamA] = makeTeamUser('Alpha');
    [$userB, $teamB] = makeTeamUser('Beta');

    actingAs($userA);
    $workflowA = Workflow::create([
        'name' => 'Workflow A',
        'status' => 'draft',
        'user_id' => $userA->id,
    ]);

    actingAs($userB);
    $workflowB = Workflow::create([
        'name' => 'Workflow B',
        'status' => 'draft',
        'user_id' => $userB->id,
    ]);

    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('super-admin');
    $admin->forceFill(['current_team_id' => $teamA->id])->save();

    actingAs($admin);
    $visibleIds = Workflow::query()->pluck('id')->all();

    expect($visibleIds)->toContain($workflowA->id)
        ->and($visibleIds)->toContain($workflowB->id);
});

/*
|--------------------------------------------------------------------------
| Ticket scoping
|--------------------------------------------------------------------------
*/

it('auto-assigns team_id on Ticket creation from current_team_id', function () {
    [$user, $team] = makeTeamUser('Alpha');
    actingAs($user);

    $ticket = Ticket::factory()->create([
        'user_id' => $user->id,
    ]);

    expect($ticket->fresh()->team_id)->toEqual($team->id);
});

it('restricts Ticket queries to the authenticated user current team', function () {
    [$userA, $teamA] = makeTeamUser('Alpha');
    [$userB, $teamB] = makeTeamUser('Beta');

    actingAs($userA);
    $ticketA = Ticket::factory()->create(['user_id' => $userA->id]);

    actingAs($userB);
    $ticketB = Ticket::factory()->create(['user_id' => $userB->id]);

    actingAs($userA);
    $visibleIds = Ticket::query()->pluck('id')->all();

    expect($visibleIds)->toContain($ticketA->id)
        ->and($visibleIds)->not->toContain($ticketB->id);
});

it('lets super-admin users see Tickets across all teams', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    [$userA, $teamA] = makeTeamUser('Alpha');
    [$userB, $teamB] = makeTeamUser('Beta');

    actingAs($userA);
    $ticketA = Ticket::factory()->create(['user_id' => $userA->id]);

    actingAs($userB);
    $ticketB = Ticket::factory()->create(['user_id' => $userB->id]);

    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('super-admin');
    $admin->forceFill(['current_team_id' => $teamA->id])->save();

    actingAs($admin);
    $visibleIds = Ticket::query()->pluck('id')->all();

    expect($visibleIds)->toContain($ticketA->id)
        ->and($visibleIds)->toContain($ticketB->id);
});

/*
|--------------------------------------------------------------------------
| Message scoping
|--------------------------------------------------------------------------
*/

it('auto-assigns team_id on Message creation from current_team_id', function () {
    [$user, $team] = makeTeamUser('Alpha');
    actingAs($user);

    $message = Message::factory()->create([
        'sender_id' => $user->id,
    ]);

    expect($message->fresh()->team_id)->toEqual($team->id);
});

it('restricts Message queries to the authenticated user current team', function () {
    [$userA, $teamA] = makeTeamUser('Alpha');
    [$userB, $teamB] = makeTeamUser('Beta');

    actingAs($userA);
    $messageA = Message::factory()->create(['sender_id' => $userA->id]);

    actingAs($userB);
    $messageB = Message::factory()->create(['sender_id' => $userB->id]);

    actingAs($userA);
    $visibleIds = Message::query()->pluck('id')->all();

    expect($visibleIds)->toContain($messageA->id)
        ->and($visibleIds)->not->toContain($messageB->id);
});

it('lets super-admin users see Messages across all teams', function () {
    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);

    [$userA, $teamA] = makeTeamUser('Alpha');
    [$userB, $teamB] = makeTeamUser('Beta');

    actingAs($userA);
    $messageA = Message::factory()->create(['sender_id' => $userA->id]);

    actingAs($userB);
    $messageB = Message::factory()->create(['sender_id' => $userB->id]);

    $admin = User::factory()->create(['email_verified_at' => now()]);
    $admin->assignRole('super-admin');
    $admin->forceFill(['current_team_id' => $teamA->id])->save();

    actingAs($admin);
    $visibleIds = Message::query()->pluck('id')->all();

    expect($visibleIds)->toContain($messageA->id)
        ->and($visibleIds)->toContain($messageB->id);
});

/*
|--------------------------------------------------------------------------
| Facebook lead team routing
|--------------------------------------------------------------------------
*/

it('routes Facebook-created leads to the MetaPage team', function () {
    $owner = User::factory()->create(['email_verified_at' => now()]);
    $team = Team::create([
        'user_id' => $owner->id,
        'name' => 'FB Team',
        'personal_team' => false,
    ]);

    $page = MetaPage::create([
        'id' => 'page_abc123',
        'page_id' => 'page_abc123',
        'user_id' => $owner->id,
        'team_id' => $team->id,
        'name' => 'Test Page',
        'access_token' => 'dummy_token',
        'last_updated' => now(),
    ]);

    $form = LeadForm::create([
        'id' => 'form_xyz',
        'external_id' => 'form_xyz',
        'page_id' => $page->page_id,
        'user_id' => $owner->id,
        'name' => 'Test Form',
        'status' => 'active',
        'questions' => [],
        'created_at' => now(),
        'last_synced' => now(),
    ]);

    $leadData = [
        'id' => 'fb_lead_001',
        'form_id' => 'form_xyz',
        'ad_id' => null,
        'is_organic' => false,
        'field_data' => [
            ['name' => 'full_name', 'values' => ['John Doe']],
            ['name' => 'email', 'values' => ['john@test.com']],
            ['name' => 'phone_number', 'values' => ['+1234567890']],
        ],
    ];

    $service = app(FacebookService::class);
    $result = $service->processLead($leadData);

    expect($result['action'])->toBe('created');

    $lead = Lead::withoutTeamScope()->where('external_id', 'fb_lead_001')->first();

    expect($lead)->not->toBeNull()
        ->and($lead->team_id)->toEqual($team->id);
});

it('leaves team_id null when the MetaPage has no team assigned', function () {
    $owner = User::factory()->create(['email_verified_at' => now()]);

    $page = MetaPage::create([
        'id' => 'page_no_team',
        'page_id' => 'page_no_team',
        'user_id' => $owner->id,
        'team_id' => null,
        'name' => 'Untyped Page',
        'access_token' => 'dummy_token',
        'last_updated' => now(),
    ]);

    $form = LeadForm::create([
        'id' => 'form_no_team',
        'external_id' => 'form_no_team',
        'page_id' => $page->page_id,
        'user_id' => $owner->id,
        'name' => 'Untyped Form',
        'status' => 'active',
        'questions' => [],
        'created_at' => now(),
        'last_synced' => now(),
    ]);

    $leadData = [
        'id' => 'fb_lead_no_team',
        'form_id' => 'form_no_team',
        'ad_id' => null,
        'is_organic' => false,
        'field_data' => [
            ['name' => 'full_name', 'values' => ['Jane Roe']],
            ['name' => 'email', 'values' => ['jane@test.com']],
            ['name' => 'phone_number', 'values' => ['+19876543210']],
        ],
    ];

    $service = app(FacebookService::class);
    $result = $service->processLead($leadData);

    expect($result['action'])->toBe('created');

    $lead = Lead::withoutTeamScope()->where('external_id', 'fb_lead_no_team')->first();

    expect($lead)->not->toBeNull()
        ->and($lead->team_id)->toBeNull();
});
