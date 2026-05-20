<?php

namespace Database\Factories\Forms;

use App\Enums\Forms\FileType;
use App\Enums\Forms\MappingMode;
use App\Models\Forms\FormTemplate;
use App\Models\Forms\Program;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FormTemplate>
 */
class FormTemplateFactory extends Factory
{
    public function definition(): array
    {
        $fileType = $this->faker->randomElement(FileType::cases());

        return [
            'program_id' => Program::factory(),
            'code' => $this->faker->unique()->slug(2),
            'name' => $this->faker->words(3, true),
            'file_path' => 'dominica-cbi/'.$this->faker->slug(2).'.'.$fileType->value,
            'file_type' => $fileType,
            'file_hash' => null,
            'mapping_mode' => $fileType === FileType::DOCX ? MappingMode::DOCX_JINJA : MappingMode::NAME,
            'page_count' => null,
            'field_count' => null,
            'sort_order' => $this->faker->numberBetween(10, 200),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }

    public function pdf(): static
    {
        return $this->state(fn () => [
            'file_type' => FileType::PDF,
            'mapping_mode' => MappingMode::NAME,
        ]);
    }

    public function docx(): static
    {
        return $this->state(fn () => [
            'file_type' => FileType::DOCX,
            'mapping_mode' => MappingMode::DOCX_JINJA,
        ]);
    }
}
