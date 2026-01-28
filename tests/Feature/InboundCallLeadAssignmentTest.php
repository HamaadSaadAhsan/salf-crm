<?php

use App\Models\CallSession;
use App\Models\Lead;
use App\Models\LeadActivity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['broadcasting.default' => 'null']);

    $this->cro = User::factory()->create([
        'availability' => true,
        'active' => true,
        'extension' => '101',
    ]);
});

describe('Inbound call lead assignment', function () {
    it('assigns unassigned lead to user who answers inbound call', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => null,
            'inquiry_status' => 'new',
        ]);

        $callSession = CallSession::factory()->create([
            'lead_id' => $lead->id,
            'caller_id' => $this->cro->id,
            'call_direction' => 'inbound',
            'status' => 'ringing',
        ]);

        // Simulate call being answered
        $callSession->update(['status' => 'answered']);

        $lead->refresh();

        expect($lead->assigned_to)->toBe($this->cro->id)
            ->and($lead->inquiry_status)->toBe('assigned_to_cro')
            ->and($lead->assigned_date)->not->toBeNull();
    });

    it('creates activity log when lead is assigned via inbound call', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => null,
            'inquiry_status' => 'new',
        ]);

        $callSession = CallSession::factory()->create([
            'lead_id' => $lead->id,
            'caller_id' => $this->cro->id,
            'call_direction' => 'inbound',
            'status' => 'ringing',
        ]);

        $callSession->update(['status' => 'answered']);

        $activity = LeadActivity::where('lead_id', $lead->id)
            ->where('type', 'assignment_change')
            ->first();

        expect($activity)->not->toBeNull()
            ->and($activity->user_id)->toBe($this->cro->id)
            ->and($activity->subject)->toBe('Lead assigned via inbound call');
    });

    it('does not reassign lead that already has an assignment', function () {
        $existingOwner = User::factory()->create();

        $lead = Lead::factory()->create([
            'assigned_to' => $existingOwner->id,
            'inquiry_status' => 'assigned_to_cro',
        ]);

        $callSession = CallSession::factory()->create([
            'lead_id' => $lead->id,
            'caller_id' => $this->cro->id,
            'call_direction' => 'inbound',
            'status' => 'ringing',
        ]);

        $callSession->update(['status' => 'answered']);

        $lead->refresh();

        // Should remain assigned to the original owner
        expect($lead->assigned_to)->toBe($existingOwner->id);
    });

    it('does not assign lead for outbound calls', function () {
        $lead = Lead::factory()->create([
            'assigned_to' => null,
            'inquiry_status' => 'new',
        ]);

        $callSession = CallSession::factory()->create([
            'lead_id' => $lead->id,
            'caller_id' => $this->cro->id,
            'call_direction' => 'outbound',
            'status' => 'ringing',
        ]);

        $callSession->update(['status' => 'answered']);

        $lead->refresh();

        // Should not be assigned (outbound calls don't auto-assign)
        expect($lead->assigned_to)->toBeNull();
    });
});
