<?php

namespace Database\Seeders;

use App\Models\Zone;
use Illuminate\Database\Seeder;

class ZoneSeeder extends Seeder
{
    public function run(): void
    {
        $zones = [
            [
                'name' => 'North America',
                'code' => 'NA',
                'description' => 'Covers United States, Canada, and Mexico territories',
                'country_code' => 'US',
                'is_active' => true,
                'metadata' => [
                    'timezone' => 'America/New_York',
                    'languages' => ['en', 'es', 'fr'],
                ],
            ],
            [
                'name' => 'Europe - Western',
                'code' => 'EU-W',
                'description' => 'Western European countries including UK, France, Germany, Spain, Portugal',
                'country_code' => 'GB',
                'is_active' => true,
                'metadata' => [
                    'timezone' => 'Europe/London',
                    'languages' => ['en', 'fr', 'de', 'es', 'pt'],
                ],
            ],
            [
                'name' => 'Europe - Eastern',
                'code' => 'EU-E',
                'description' => 'Eastern European countries including Poland, Czech Republic, Hungary',
                'country_code' => 'PL',
                'is_active' => true,
                'metadata' => [
                    'timezone' => 'Europe/Warsaw',
                    'languages' => ['pl', 'cs', 'hu', 'ro'],
                ],
            ],
            [
                'name' => 'Middle East',
                'code' => 'ME',
                'description' => 'Covers UAE, Saudi Arabia, Qatar, and other Gulf countries',
                'country_code' => 'AE',
                'is_active' => true,
                'metadata' => [
                    'timezone' => 'Asia/Dubai',
                    'languages' => ['ar', 'en'],
                ],
            ],
            [
                'name' => 'Caribbean',
                'code' => 'CAR',
                'description' => 'Caribbean islands including Dominica, St. Kitts, Antigua, Grenada, St. Lucia',
                'country_code' => 'DM',
                'is_active' => true,
                'metadata' => [
                    'timezone' => 'America/Dominica',
                    'languages' => ['en'],
                ],
            ],
            [
                'name' => 'Asia Pacific',
                'code' => 'APAC',
                'description' => 'Asia Pacific region including China, Japan, Singapore, Australia',
                'country_code' => 'SG',
                'is_active' => true,
                'metadata' => [
                    'timezone' => 'Asia/Singapore',
                    'languages' => ['en', 'zh', 'ja', 'ko'],
                ],
            ],
            [
                'name' => 'South America',
                'code' => 'SA',
                'description' => 'South American countries including Brazil, Argentina, Chile',
                'country_code' => 'BR',
                'is_active' => true,
                'metadata' => [
                    'timezone' => 'America/Sao_Paulo',
                    'languages' => ['pt', 'es'],
                ],
            ],
            [
                'name' => 'Africa',
                'code' => 'AF',
                'description' => 'African continent coverage',
                'country_code' => 'ZA',
                'is_active' => true,
                'metadata' => [
                    'timezone' => 'Africa/Johannesburg',
                    'languages' => ['en', 'fr', 'ar'],
                ],
            ],
        ];

        foreach ($zones as $zoneData) {
            Zone::updateOrCreate(
                ['name' => $zoneData['name']],
                $zoneData,
            );
        }
    }
}
