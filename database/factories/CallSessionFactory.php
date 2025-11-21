<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\SipAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CallSession>
 */
class CallSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $caller = User::factory()->create();
        $callerSipAccount = SipAccount::factory()->create(['user_id' => $caller->id]);

        return [
            'session_id' => Str::uuid(),
            'caller_id' => $caller->id,
            'lead_id' => null,
            'caller_sip_account_id' => $callerSipAccount->id,
            'callee_sip_account_id' => null,
            'call_direction' => fake()->randomElement(['inbound', 'outbound']),
            'call_type' => fake()->randomElement(['voice', 'video']),
            'status' => 'initiated',
            'caller_number' => fake()->phoneNumber(),
            'callee_number' => fake()->phoneNumber(),
            'started_at' => now(),
            'answered_at' => null,
            'ended_at' => null,
            'duration' => null,
            'end_reason' => null,
            'call_signature' => null,
            'recording_path' => null,
        ];
    }

    public function answered(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'answered',
            'answered_at' => now()->subMinutes(5),
        ]);
    }

    public function ended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'ended',
            'answered_at' => now()->subMinutes(10),
            'ended_at' => now()->subMinutes(5),
            'duration' => 300,
            'end_reason' => 'hangup',
        ]);
    }

    public function withLead(): static
    {
        return $this->state(fn (array $attributes) => [
            'lead_id' => Lead::factory(),
        ]);
    }

    public function withRecording(): static
    {
        return $this->state(fn (array $attributes) => [
            'recording_path' => 'recordings/'.Str::uuid().'.wav',
        ]);
    }
}
