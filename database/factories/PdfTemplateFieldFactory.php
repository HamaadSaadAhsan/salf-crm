<?php

namespace Database\Factories;

use App\Models\PdfTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PdfTemplateField>
 */
class PdfTemplateFieldFactory extends Factory
{
    public function definition(): array
    {
        return [
            'pdf_template_id' => PdfTemplate::factory(),
            'field_name' => fake()->word().'_'.fake()->randomNumber(3),
            'field_label' => fake()->words(2, true),
            'field_type' => 'text',
            'sort_order' => fake()->numberBetween(0, 20),
            'page_number' => fake()->numberBetween(1, 7),
            'is_required' => false,
        ];
    }

    public function required(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_required' => true,
        ]);
    }

    public function checkbox(): static
    {
        return $this->state(fn (array $attributes) => [
            'field_type' => 'checkbox',
        ]);
    }

    public function dropdown(array $options = []): static
    {
        return $this->state(fn (array $attributes) => [
            'field_type' => 'dropdown',
            'field_options' => $options ?: ['Option A', 'Option B', 'Option C'],
        ]);
    }

    public function withSection(string $section): static
    {
        return $this->state(fn (array $attributes) => [
            'section' => $section,
        ]);
    }

    public function repeatGroup(string $group): static
    {
        return $this->state(fn (array $attributes) => [
            'repeat_group' => $group,
        ]);
    }
}
