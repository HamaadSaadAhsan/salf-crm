<?php

namespace Database\Seeders;

use App\Models\LeadSource;
use Illuminate\Database\Seeder;

class InboundCallLeadSourceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        LeadSource::updateOrCreate(
            ['identifier' => 'inbound-call'],
            [
                'name' => 'Inbound Call',
                'slug' => 'inbound-call',
                'status' => 'active',
            ]
        );

        $this->command->info('Inbound Call lead source created successfully.');
    }
}
