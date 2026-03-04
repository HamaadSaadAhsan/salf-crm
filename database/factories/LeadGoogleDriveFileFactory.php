<?php

namespace Database\Factories;

use App\Models\Lead;
use App\Models\StorageAccount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LeadGoogleDriveFile>
 */
class LeadGoogleDriveFileFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lead_id' => Lead::factory(),
            'storage_account_id' => StorageAccount::factory(),
            'google_file_id' => fake()->sha256(),
            'file_name' => fake()->word().'.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => fake()->numberBetween(1024, 10485760),
            'icon_link' => 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
            'web_view_link' => 'https://drive.google.com/file/d/'.fake()->sha256().'/view',
            'thumbnail_link' => null,
        ];
    }
}
