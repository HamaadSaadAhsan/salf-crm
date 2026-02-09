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

        LeadSource::updateOrCreate(
            ['identifier' => 'outbound-call'],
            [
                'name' => 'Outbound Call',
                'slug' => 'outbound-call',
                'status' => 'active',
            ]
        );

        $this->command->info('Inbound & Outbound Call lead sources created successfully.');
    }
}
