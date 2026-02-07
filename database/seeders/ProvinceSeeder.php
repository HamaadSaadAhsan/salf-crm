<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\Province;
use Illuminate\Database\Seeder;

class ProvinceSeeder extends Seeder
{
    public function run(): void
    {
        $provincesByCountryCode = [
            // United States - Major States
            'USA' => [
                ['name' => 'California', 'code' => 'CA'],
                ['name' => 'Texas', 'code' => 'TX'],
                ['name' => 'Florida', 'code' => 'FL'],
                ['name' => 'New York', 'code' => 'NY'],
                ['name' => 'Illinois', 'code' => 'IL'],
                ['name' => 'Pennsylvania', 'code' => 'PA'],
                ['name' => 'Ohio', 'code' => 'OH'],
                ['name' => 'Georgia', 'code' => 'GA'],
                ['name' => 'North Carolina', 'code' => 'NC'],
                ['name' => 'Michigan', 'code' => 'MI'],
                ['name' => 'General', 'code' => null],
            ],

            // Canada - Provinces
            'CAN' => [
                ['name' => 'Ontario', 'code' => 'ON'],
                ['name' => 'Quebec', 'code' => 'QC'],
                ['name' => 'British Columbia', 'code' => 'BC'],
                ['name' => 'Alberta', 'code' => 'AB'],
                ['name' => 'Manitoba', 'code' => 'MB'],
                ['name' => 'Saskatchewan', 'code' => 'SK'],
            ],

            // United Kingdom - Countries
            'GBR' => [
                ['name' => 'England', 'code' => 'ENG'],
                ['name' => 'Scotland', 'code' => 'SCT'],
                ['name' => 'Wales', 'code' => 'WLS'],
                ['name' => 'Northern Ireland', 'code' => 'NIR'],
                ['name' => 'General', 'code' => null],
            ],

            // Portugal
            'PRT' => [
                ['name' => 'General', 'code' => null],
                ['name' => 'ALL', 'code' => null],
            ],

            // UAE - Emirates
            'ARE' => [
                ['name' => 'Abu Dhabi', 'code' => 'AZ'],
                ['name' => 'Dubai', 'code' => 'DU'],
                ['name' => 'Sharjah', 'code' => 'SH'],
                ['name' => 'Ajman', 'code' => 'AJ'],
                ['name' => 'Ras Al Khaimah', 'code' => 'RK'],
                ['name' => 'Fujairah', 'code' => 'FU'],
                ['name' => 'Umm Al Quwain', 'code' => 'UQ'],
                ['name' => 'General', 'code' => null],
            ],

            // Pakistan - Provinces and Territories
            'PAK' => [
                ['name' => 'Punjab', 'code' => 'PB'],
                ['name' => 'Sindh', 'code' => 'SD'],
                ['name' => 'Khyber Pakhtunkhwa', 'code' => 'KP'],
                ['name' => 'Balochistan', 'code' => 'BA'],
                ['name' => 'Gilgit-Baltistan', 'code' => 'GB'],
                ['name' => 'Azad Jammu and Kashmir', 'code' => 'JK'],
                ['name' => 'Islamabad Capital Territory', 'code' => 'IS'],
                ['name' => 'Islamabad', 'code' => null],
            ],

            // International
            'INT' => [
                ['name' => 'ALL', 'code' => null],
            ],
        ];

        foreach ($provincesByCountryCode as $countryCode => $provinces) {
            $country = Country::where('code', $countryCode)->first();
            if (! $country) {
                continue;
            }

            foreach ($provinces as $provinceData) {
                Province::updateOrCreate(
                    [
                        'country_id' => $country->id,
                        'name' => $provinceData['name'],
                    ],
                    [
                        'code' => $provinceData['code'],
                        'is_active' => true,
                    ],
                );
            }
        }
    }
}
