<?php

use App\Models\Lead;
use App\Models\User;
use App\Notifications\LeadActivityNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    Role::firstOrCreate(['name' => 'super-admin', 'guard_name' => 'web']);
    Role::firstOrCreate(['name' => 'support-agent', 'guard_name' => 'web']);

    $this->admin = User::factory()->create();
    $this->admin->assignRole('super-admin');
});

describe('Mention Users API', function () {
    it('returns filtered users for authenticated user', function () {
        $agent = User::factory()->create();
        $agent->assignRole('support-agent');

        User::factory()->create(['name' => 'Alice Johnson']);
        User::factory()->create(['name' => 'Bob Smith']);
        User::factory()->create(['name' => 'Alice Carter']);

        $response = $this->actingAs($agent)->getJson('/api/mention-users?search=Alice');

        $response->assertOk();
        $data = $response->json('data');
        expect($data)->toHaveCount(2);
        expect(collect($data)->pluck('name')->sort()->values()->all())
            ->toBe(['Alice Carter', 'Alice Johnson']);
    });

    it('paginates results', function () {
        User::factory()->count(15)->create();

        $response = $this->actingAs($this->admin)->getJson('/api/mention-users?per_page=5');

        $response->assertOk();
        expect($response->json('data'))->toHaveCount(5);
        expect($response->json('meta.total'))->toBeGreaterThanOrEqual(15);
    });

    it('requires authentication', function () {
        $this->getJson('/api/mention-users')
            ->assertUnauthorized();
    });
});

describe('Comment with Mentions', function () {
    it('creates a comment with mentions and notifies mentioned users', function () {
        Notification::fake();

        $lead = Lead::factory()->create();
        $mentioned1 = User::factory()->create(['name' => 'John Doe']);
        $mentioned2 = User::factory()->create(['name' => 'Jane Smith']);

        $response = $this->actingAs($this->admin)->postJson('/lead-activities', [
            'lead_id' => $lead->id,
            'type' => 'note',
            'description' => 'Hey @John Doe and @Jane Smith please review this',
            'metadata' => [
                'mentions' => [
                    ['user_id' => $mentioned1->id, 'name' => 'John Doe'],
                    ['user_id' => $mentioned2->id, 'name' => 'Jane Smith'],
                ],
            ],
        ]);

        $response->assertOk();

        Notification::assertSentTo($mentioned1, LeadActivityNotification::class, function ($notification) {
            return $notification->action === 'mentioned';
        });

        Notification::assertSentTo($mentioned2, LeadActivityNotification::class, function ($notification) {
            return $notification->action === 'mentioned';
        });
    });

    it('does not notify the author when they mention themselves', function () {
        Notification::fake();

        $lead = Lead::factory()->create();

        $response = $this->actingAs($this->admin)->postJson('/lead-activities', [
            'lead_id' => $lead->id,
            'type' => 'note',
            'description' => 'Note to self @'.$this->admin->name,
            'metadata' => [
                'mentions' => [
                    ['user_id' => $this->admin->id, 'name' => $this->admin->name],
                ],
            ],
        ]);

        $response->assertOk();
        Notification::assertNotSentTo($this->admin, LeadActivityNotification::class);
    });

    it('creates comment without mentions and sends no mention notifications', function () {
        Notification::fake();

        $lead = Lead::factory()->create();

        $response = $this->actingAs($this->admin)->postJson('/lead-activities', [
            'lead_id' => $lead->id,
            'type' => 'note',
            'description' => 'Just a regular comment',
        ]);

        $response->assertOk();
        Notification::assertNothingSent();
    });

    it('stores metadata with mentions and task refs', function () {
        Notification::fake();

        $lead = Lead::factory()->create();
        $mentioned = User::factory()->create(['name' => 'Alice']);

        $response = $this->actingAs($this->admin)->postJson('/lead-activities', [
            'lead_id' => $lead->id,
            'type' => 'note',
            'description' => 'Check @Alice for #Follow up task',
            'metadata' => [
                'mentions' => [
                    ['user_id' => $mentioned->id, 'name' => 'Alice'],
                ],
                'task_refs' => [
                    ['task_id' => 'abc-123', 'title' => 'Follow up task'],
                ],
            ],
        ]);

        $response->assertOk();

        $activity = \App\Models\LeadActivity::where('lead_id', $lead->id)->first();
        expect($activity->metadata)->toHaveKey('mentions');
        expect($activity->metadata['mentions'])->toHaveCount(1);
        expect($activity->metadata['task_refs'])->toHaveCount(1);
        expect($activity->metadata['task_refs'][0]['title'])->toBe('Follow up task');
    });

    it('mention notification contains correct data', function () {
        Notification::fake();

        $lead = Lead::factory()->create(['name' => 'Test Lead']);
        $mentioned = User::factory()->create(['name' => 'Bob']);

        $this->actingAs($this->admin)->postJson('/lead-activities', [
            'lead_id' => $lead->id,
            'type' => 'note',
            'description' => 'Hey @Bob check this lead',
            'metadata' => [
                'mentions' => [
                    ['user_id' => $mentioned->id, 'name' => 'Bob'],
                ],
            ],
        ]);

        Notification::assertSentTo($mentioned, LeadActivityNotification::class, function ($notification) use ($lead) {
            $data = $notification->toArray($notification);
            expect($data['action'])->toBe('mentioned');
            expect($data['lead_name'])->toBe('Test Lead');
            expect($data['lead_id'])->toBe($lead->id);
            expect($data['title'])->toContain('mentioned');

            return true;
        });
    });
});
