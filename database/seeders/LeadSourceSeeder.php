<?php

// database/seeders/LeadSourceSeeder.php
namespace Database\Seeders;

use App\Models\LeadSource;
use Illuminate\Database\Seeder;

class LeadSourceSeeder extends Seeder
{
    public function run(): void
    {
        $leadSources = [
            'Website Contact Form',
            'Facebook Ads',
            'Google Ads',
            'Email Campaign',
            'Referral',
            'Cold Call',
            'Trade Show',
            'LinkedIn',
            'Organic Search',
            'Direct Mail',
            'YouTube Ads',
            'Instagram Ads',
            'Webinar',
            'Content Marketing',
            'Partner Referral',
            'Event/Conference',
            'WhatsApp',
            'Telegram',
            'Print Advertisement',
            'Radio Advertisement',
        ];

        foreach ($leadSources as $source) {
            LeadSource::firstOrCreate([
                'name' => $source,
                'status' => 'active',
            ]);
        }
    }
}
