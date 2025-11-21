<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SipAccount>
 */
class SipAccountFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'username' => fake()->userName(),
            'password' => fake()->password(),
            'domain' => fake()->domainName(),
            'display_name' => fake()->name(),
            'port' => 5060,
            'transport' => fake()->randomElement(['udp', 'tcp', 'tls']),
            'status' => 'registered',
            'codec_priority' => 'ulaw,alaw,gsm',
            'is_enabled' => true,
        ];
    }

    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'is_enabled' => true,
        ]);
    }

    public function disabled(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_enabled' => false,
        ]);
    }
}
