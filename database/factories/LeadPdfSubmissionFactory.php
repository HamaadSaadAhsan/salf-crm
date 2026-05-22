<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\LeadPdfSubmission;
use App\Models\PdfTemplate;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadPdfSubmission>
 */
class LeadPdfSubmissionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory(),
            'pdf_template_id' => PdfTemplate::factory(),
            'field_values' => ['full_name' => fake()->name(), 'email' => fake()->email()],
            'status' => 'draft',
            'submitted_by' => User::factory(),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'completed',
        ]);
    }
}
