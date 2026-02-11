<?php

use App\Events\LeadRequalified;
use App\Events\LeadStageChanged;
use App\Jobs\WarmDashboardCacheJob;
use App\Models\Lead;
use App\Models\User;
use App\Notifications\LeadRequalifiedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    $this->croRole = Role::create(['name' => 'support-agent']);
    $this->advisorRole = Role::create(['name' => 'sales-rep']);

    $editPermission = Permission::create(['name' => 'edit leads']);
    $viewPermission = Permission::create(['name' => 'view leads']);
    $this->croRole->givePermissionTo([$editPermission, $viewPermission]);
    $this->advisorRole->givePermissionTo([$editPermission, $viewPermission]);

    $this->cro = User::factory()->create();
    $this->cro->assignRole($this->croRole);

    $this->advisor = User::factory()->create();
    $this->advisor->assignRole($this->advisorRole);
});

it('dispatches LeadRequalified event when advisor requalifies a lead', function () {
    Event::fake([LeadRequalified::class, LeadStageChanged::class]);
    Queue::fake([WarmDashboardCacheJob::class]);

    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
        'advisor_stage' => 'contacted',
    ]);

    $response = $this->actingAs($this->advisor)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'requalify',
            'requalify_reason' => 'Client needs different service',
        ]);

    $response->assertOk();

    Event::assertDispatched(LeadRequalified::class, function ($event) use ($lead) {
        return $event->lead->id === $lead->id
            && $event->reason === 'Client needs different service';
    });

    Event::assertDispatched(LeadStageChanged::class, function ($event) {
        return $event->changeType === 'status_change'
            && $event->fromStage === 'assigned_to_advisor'
            && $event->toStage === 'requalify';
    });
});

it('sends LeadRequalifiedNotification to the CRO who qualified the lead', function () {
    Notification::fake();
    Queue::fake([WarmDashboardCacheJob::class]);

    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
        'advisor_stage' => 'new',
    ]);

    // Directly dispatch the event and let the listener handle it
    $event = new \App\Events\LeadRequalified(
        lead: $lead,
        requalifiedBy: $this->advisor,
        reason: 'Budget too low'
    );

    $listener = new \App\Listeners\SendLeadRequalifiedNotification;
    $listener->handle($event);

    Notification::assertSentTo($this->cro, LeadRequalifiedNotification::class, function ($notification) use ($lead) {
        return $notification->lead->id === $lead->id
            && $notification->reason === 'Budget too low';
    });
});

it('dispatches LeadStageChanged event when advisor stage progresses', function () {
    Event::fake([LeadStageChanged::class]);
    Queue::fake([WarmDashboardCacheJob::class]);

    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'advisor_stage' => 'new',
    ]);

    $response = $this->actingAs($this->advisor)
        ->putJson(route('leads.update-advisor-stage', $lead), [
            'stage' => 'contacted',
        ]);

    $response->assertOk();

    Event::assertDispatched(LeadStageChanged::class, function ($event) {
        return $event->changeType === 'advisor_stage'
            && $event->fromStage === 'new'
            && $event->toStage === 'contacted';
    });
});

it('dispatches WarmDashboardCacheJob after lead status change', function () {
    Event::fake([LeadRequalified::class, LeadStageChanged::class]);
    Queue::fake([WarmDashboardCacheJob::class]);

    $lead = Lead::factory()->create([
        'inquiry_status' => 'new',
        'assigned_to' => $this->cro->id,
    ]);

    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'contacted',
        ])
        ->assertOk();

    Queue::assertPushed(WarmDashboardCacheJob::class);
});

it('reassigns lead back to original advisor after multi-step requalification flow', function () {
    Event::fake([LeadRequalified::class, LeadStageChanged::class]);
    Queue::fake([WarmDashboardCacheJob::class]);

    // Lead is with the advisor
    $lead = Lead::factory()->create([
        'inquiry_status' => 'assigned_to_advisor',
        'assigned_to' => $this->advisor->id,
        'qualified_by' => $this->cro->id,
        'advisor_stage' => 'contacted',
    ]);

    // Step 1: Advisor sends lead back for requalification
    $this->actingAs($this->advisor)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'requalify',
            'requalify_reason' => 'Needs different approach',
        ])
        ->assertOk();

    $lead->refresh();
    expect($lead->inquiry_status)->toBe('requalify');
    expect($lead->requalified_from_advisor_id)->toBe($this->advisor->id);

    // Step 2: CRO moves lead to qualified (multi-step: requalify → qualified)
    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'qualified',
        ])
        ->assertOk();

    $lead->refresh();
    expect($lead->inquiry_status)->toBe('qualified');

    // Step 3: CRO assigns lead to advisor (qualified → assigned_to_advisor)
    $this->actingAs($this->cro)
        ->putJson(route('leads.update', $lead), [
            'inquiry_status' => 'assigned_to_advisor',
        ])
        ->assertOk();

    $lead->refresh();
    expect($lead->inquiry_status)->toBe('assigned_to_advisor');
    expect($lead->assigned_to)->toBe($this->advisor->id);
    expect($lead->advisor_stage)->toBe('new');
});
