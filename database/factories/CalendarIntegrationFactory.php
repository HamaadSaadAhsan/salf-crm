<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CalendarIntegration>
 */
class CalendarIntegrationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'id' => Str::random(25),
            'user_id' => User::factory(),
            'google_account_email' => $this->faker->safeEmail(),
            'access_token' => Str::random(64),
            'refresh_token' => Str::random(64),
            'token_expires_at' => now()->addHour(),
            'is_active' => true,
            'sync_preferences' => [
                'syncLeads' => true,
                'syncFollowUps' => true,
                'defaultCalendarId' => 'primary',
            ],
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function withExpiredToken(): static
    {
        return $this->state(fn () => ['token_expires_at' => now()->subHour()]);
    }

    public function syncLeadsDisabled(): static
    {
        return $this->state(fn () => [
            'sync_preferences' => [
                'syncLeads' => false,
                'syncFollowUps' => true,
                'defaultCalendarId' => 'primary',
            ],
        ]);
    }
}
