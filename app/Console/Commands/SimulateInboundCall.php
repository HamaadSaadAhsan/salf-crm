<?php

namespace App\Console\Commands;

use App\Events\InboundCallReceived;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Console\Command;

use function Laravel\Prompts\confirm;
use function Laravel\Prompts\select;
use function Laravel\Prompts\text;

class SimulateInboundCall extends Command
{
    protected $signature = 'call:simulate
                            {--extension= : Target extension to ring}
                            {--caller= : Caller phone number}
                            {--scenario= : Scenario to simulate (ring-only, full-call, timeout, caller-hangup, answered-elsewhere)}
                            {--lead-id= : Optional lead ID to attach}
                            {--delay=2 : Delay between events in seconds}';

    protected $description = 'Simulate inbound call AMI events for testing';

    public function handle(): int
    {
        $this->info('🎭 AMI Call Simulator');
        $this->newLine();

        // Get target extension
        $extension = $this->option('extension') ?: select(
            label: 'Select target extension',
            options: User::whereNotNull('extension')
                ->pluck('extension', 'extension')
                ->mapWithKeys(fn ($ext, $key) => [
                    $ext => $ext.' - '.User::where('extension', $ext)->first()?->name,
                ])
                ->toArray(),
        );

        // Get caller number
        $caller = $this->option('caller') ?: text(
            label: 'Enter caller phone number',
            default: '+971501234567',
            required: true,
        );

        // Get scenario
        $scenario = $this->option('scenario') ?: select(
            label: 'Select scenario to simulate',
            options: [
                'ring-only' => 'Ring only (no answer, no timeout)',
                'full-call' => 'Full call (ring → connect → hangup)',
                'timeout' => 'Timeout (ring → stop_ringing with timeout)',
                'caller-hangup' => 'Caller hangup (ring → stop_ringing with caller_hangup)',
                'answered-elsewhere' => 'Answered elsewhere (ring → stop_ringing with answered_elsewhere)',
                'custom' => 'Custom sequence (step by step)',
            ],
        );

        // Get optional lead
        $leadId = $this->option('lead-id');
        $lead = null;

        if (! $leadId && confirm('Attach a lead to this call?', false)) {
            $lead = Lead::where('phone', 'like', '%'.substr($caller, -9).'%')->first();
            if ($lead) {
                $this->info("Found matching lead: {$lead->name} (ID: {$lead->id})");
            } else {
                $leadId = text('Enter lead ID (or leave empty):', default: '');
                if ($leadId) {
                    $lead = Lead::find($leadId);
                }
            }
        } elseif ($leadId) {
            $lead = Lead::find($leadId);
        }

        $delay = (int) $this->option('delay');
        $uniqueid = '1737600000.'.random_int(1000, 9999);
        $linkedid = $uniqueid;
        $sessionId = 'SIM-'.now()->format('YmdHis');

        $user = User::where('extension', $extension)->first();

        $this->newLine();
        $this->table(
            ['Parameter', 'Value'],
            [
                ['Extension', $extension],
                ['Caller', $caller],
                ['Scenario', $scenario],
                ['Lead', $lead ? "{$lead->name} (ID: {$lead->id})" : 'None'],
                ['Unique ID', $uniqueid],
                ['Session ID', $sessionId],
                ['Delay', "{$delay}s"],
            ]
        );

        if (! confirm('Proceed with simulation?', true)) {
            $this->warn('Simulation cancelled.');

            return self::SUCCESS;
        }

        $this->newLine();

        match ($scenario) {
            'ring-only' => $this->simulateRingOnly($extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user),
            'full-call' => $this->simulateFullCall($extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, $delay),
            'timeout' => $this->simulateTimeout($extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, $delay),
            'caller-hangup' => $this->simulateCallerHangup($extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, $delay),
            'answered-elsewhere' => $this->simulateAnsweredElsewhere($extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, $delay),
            'custom' => $this->simulateCustom($extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user),
            default => $this->error('Unknown scenario'),
        };

        $this->newLine();
        $this->info('✅ Simulation complete!');

        return self::SUCCESS;
    }

    private function broadcastEvent(
        string $event,
        string $extension,
        string $caller,
        string $uniqueid,
        string $linkedid,
        string $sessionId,
        ?Lead $lead,
        ?User $user,
        ?string $reason = null,
        ?string $dialstatus = null,
        ?int $answeredByUserId = null
    ): void {
        $this->line("  📡 Broadcasting: <fg=yellow>{$event}</> event");

        InboundCallReceived::dispatch(
            $event,
            $caller,
            $extension,
            $uniqueid,
            $linkedid,
            $sessionId,
            $lead,
            'inbound',
            $extension,
            null,
            $answeredByUserId,
            $user?->id,
            false,
            $reason,
            $dialstatus,
        );

        $this->line("     → target_extension: {$extension}");
        if ($reason) {
            $this->line("     → reason: {$reason}");
        }
        if ($dialstatus) {
            $this->line("     → dialstatus: {$dialstatus}");
        }
    }

    private function simulateRingOnly(string $extension, string $caller, string $uniqueid, string $linkedid, string $sessionId, ?Lead $lead, ?User $user): void
    {
        $this->info('📞 Scenario: Ring Only');
        $this->broadcastEvent('ring', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user);
        $this->comment('  → Dialog should appear and stay open');
    }

    private function simulateFullCall(string $extension, string $caller, string $uniqueid, string $linkedid, string $sessionId, ?Lead $lead, ?User $user, int $delay): void
    {
        $this->info('📞 Scenario: Full Call (ring → connect → hangup)');

        $this->broadcastEvent('ring', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user);
        $this->comment('  → Dialog should appear (ringing state)');

        $this->waitWithCountdown($delay, 'Waiting before connect');

        $this->broadcastEvent('connect', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, answeredByUserId: $user?->id);
        $this->comment('  → Dialog should show connected state');

        $this->waitWithCountdown($delay * 2, 'Simulating call duration');

        $this->broadcastEvent('hangup', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user);
        $this->comment('  → Dialog should close');
    }

    private function simulateTimeout(string $extension, string $caller, string $uniqueid, string $linkedid, string $sessionId, ?Lead $lead, ?User $user, int $delay): void
    {
        $this->info('📞 Scenario: Timeout (ring → stop_ringing with timeout/NOANSWER)');

        $this->broadcastEvent('ring', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user);
        $this->comment('  → Dialog should appear (ringing state)');

        $this->waitWithCountdown($delay, 'Waiting before timeout');

        $this->broadcastEvent('stop_ringing', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, reason: 'timeout', dialstatus: 'NOANSWER');
        $this->comment('  → Dialog should close with "Call not answered" toast');
    }

    private function simulateCallerHangup(string $extension, string $caller, string $uniqueid, string $linkedid, string $sessionId, ?Lead $lead, ?User $user, int $delay): void
    {
        $this->info('📞 Scenario: Caller Hangup (ring → stop_ringing with caller_hangup/CANCEL)');

        $this->broadcastEvent('ring', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user);
        $this->comment('  → Dialog should appear (ringing state)');

        $this->waitWithCountdown($delay, 'Waiting before caller hangs up');

        $this->broadcastEvent('stop_ringing', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, reason: 'caller_hangup', dialstatus: 'CANCEL');
        $this->comment('  → Dialog should close with "Caller hung up" toast');
    }

    private function simulateAnsweredElsewhere(string $extension, string $caller, string $uniqueid, string $linkedid, string $sessionId, ?Lead $lead, ?User $user, int $delay): void
    {
        $this->info('📞 Scenario: Answered Elsewhere (ring → stop_ringing with answered_elsewhere)');

        $this->broadcastEvent('ring', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user);
        $this->comment('  → Dialog should appear (ringing state)');

        $this->waitWithCountdown($delay, 'Waiting before another CRO answers');

        $this->broadcastEvent('stop_ringing', $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, reason: 'answered_elsewhere');
        $this->comment('  → Dialog should close (another CRO answered)');
    }

    private function simulateCustom(string $extension, string $caller, string $uniqueid, string $linkedid, string $sessionId, ?Lead $lead, ?User $user): void
    {
        $this->info('📞 Scenario: Custom (step by step)');

        while (true) {
            $event = select(
                label: 'Select event to broadcast',
                options: [
                    'ring' => 'ring - Phone starts ringing',
                    'connect' => 'connect - Call answered',
                    'stop_ringing' => 'stop_ringing - Stop ringing (with reason)',
                    'hangup' => 'hangup - Call ended',
                    'disconnect' => 'disconnect - Call disconnected',
                    'done' => '✓ Done - Exit simulation',
                ],
            );

            if ($event === 'done') {
                break;
            }

            $reason = null;
            $dialstatus = null;

            if ($event === 'stop_ringing') {
                $reason = select(
                    label: 'Select stop_ringing reason',
                    options: [
                        'timeout' => 'timeout - No answer timeout',
                        'caller_hangup' => 'caller_hangup - Caller hung up',
                        'busy' => 'busy - All agents busy',
                        'answered_elsewhere' => 'answered_elsewhere - Another CRO answered',
                        'none' => '(none) - No reason',
                    ],
                );

                if ($reason === 'none') {
                    $reason = null;
                }

                $dialstatus = select(
                    label: 'Select dialstatus',
                    options: [
                        'NOANSWER' => 'NOANSWER',
                        'CANCEL' => 'CANCEL',
                        'BUSY' => 'BUSY',
                        'ANSWER' => 'ANSWER',
                        'none' => '(none)',
                    ],
                );

                if ($dialstatus === 'none') {
                    $dialstatus = null;
                }
            }

            $this->broadcastEvent($event, $extension, $caller, $uniqueid, $linkedid, $sessionId, $lead, $user, $reason, $dialstatus, $event === 'connect' ? $user?->id : null);
        }
    }

    private function waitWithCountdown(int $seconds, string $message): void
    {
        $this->newLine();
        for ($i = $seconds; $i > 0; $i--) {
            $this->output->write("\r  ⏳ {$message}... {$i}s ");
            sleep(1);
        }
        $this->output->write("\r".str_repeat(' ', 50)."\r");
    }
}
