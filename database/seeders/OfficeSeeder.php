<?php

namespace Database\Seeders;

use App\Models\Office;
use App\Models\Zone;
use Illuminate\Database\Seeder;

class OfficeSeeder extends Seeder
{
    public function run(): void
    {
        $zones = Zone::all()->keyBy('code');

        $offices = [
            // North America Offices
            [
                'zone_code' => 'NA',
                'name' => 'New York Office',
                'code' => 'NYC-001',
                'address' => '350 Fifth Avenue, Suite 7600',
                'city' => 'New York',
                'country_code' => 'US',
                'postal_code' => '10118',
                'phone' => '+1 (212) 555-0100',
                'email' => 'newyork@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 6:00 PM EST',
                    'specializations' => ['EB-5', 'Canada Immigration'],
                ],
            ],
            [
                'zone_code' => 'NA',
                'name' => 'Miami Office',
                'code' => 'MIA-001',
                'address' => '1450 Brickell Avenue, Suite 1900',
                'city' => 'Miami',
                'country_code' => 'US',
                'postal_code' => '33131',
                'phone' => '+1 (305) 555-0200',
                'email' => 'miami@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 6:00 PM EST',
                    'specializations' => ['Caribbean Programs', 'Latin America'],
                ],
            ],
            [
                'zone_code' => 'NA',
                'name' => 'Toronto Office',
                'code' => 'TOR-001',
                'address' => '100 King Street West, Suite 5600',
                'city' => 'Toronto',
                'country_code' => 'CA',
                'postal_code' => 'M5X 1C9',
                'phone' => '+1 (416) 555-0300',
                'email' => 'toronto@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 5:00 PM EST',
                    'specializations' => ['Canada Immigration', 'Business Immigration'],
                ],
            ],

            // Europe - Western Offices
            [
                'zone_code' => 'EU-W',
                'name' => 'London Office',
                'code' => 'LON-001',
                'address' => '1 Poultry, 7th Floor',
                'city' => 'London',
                'country_code' => 'GB',
                'postal_code' => 'EC2R 8EJ',
                'phone' => '+44 20 7946 0958',
                'email' => 'london@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 5:30 PM GMT',
                    'specializations' => ['UK Immigration', 'Europe Golden Visas'],
                ],
            ],
            [
                'zone_code' => 'EU-W',
                'name' => 'Lisbon Office',
                'code' => 'LIS-001',
                'address' => 'Avenida da Liberdade 110',
                'city' => 'Lisbon',
                'country_code' => 'PT',
                'postal_code' => '1269-046',
                'phone' => '+351 21 123 4567',
                'email' => 'lisbon@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 6:00 PM WET',
                    'specializations' => ['Portugal Golden Visa', 'D7 Visa'],
                ],
            ],
            [
                'zone_code' => 'EU-W',
                'name' => 'Madrid Office',
                'code' => 'MAD-001',
                'address' => 'Paseo de la Castellana 95',
                'city' => 'Madrid',
                'country_code' => 'ES',
                'postal_code' => '28046',
                'phone' => '+34 91 123 4567',
                'email' => 'madrid@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 6:00 PM CET',
                    'specializations' => ['Spain Golden Visa', 'Non-Lucrative Visa'],
                ],
            ],

            // Middle East Offices
            [
                'zone_code' => 'ME',
                'name' => 'Dubai Office',
                'code' => 'DXB-001',
                'address' => 'Dubai International Financial Centre, Gate Village 10',
                'city' => 'Dubai',
                'country_code' => 'AE',
                'postal_code' => '506620',
                'phone' => '+971 4 123 4567',
                'email' => 'dubai@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 6:00 PM GST',
                    'specializations' => ['UAE Golden Visa', 'GCC Residency'],
                ],
            ],
            [
                'zone_code' => 'ME',
                'name' => 'Abu Dhabi Office',
                'code' => 'AUH-001',
                'address' => 'Al Maryah Island, The Galleria',
                'city' => 'Abu Dhabi',
                'country_code' => 'AE',
                'postal_code' => '114898',
                'phone' => '+971 2 123 4567',
                'email' => 'abudhabi@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '8:30 AM - 5:30 PM GST',
                    'specializations' => ['UAE Golden Visa', 'Investment Immigration'],
                ],
            ],

            // Caribbean Office
            [
                'zone_code' => 'CAR',
                'name' => 'Roseau Office',
                'code' => 'DOM-001',
                'address' => 'Kennedy Avenue, Government Headquarters',
                'city' => 'Roseau',
                'country_code' => 'DM',
                'postal_code' => null,
                'phone' => '+1 (767) 123-4567',
                'email' => 'dominica@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '8:00 AM - 4:00 PM AST',
                    'specializations' => ['Dominica CBI', 'Caribbean Citizenship Programs'],
                ],
            ],
            [
                'zone_code' => 'CAR',
                'name' => 'St. Georges Office',
                'code' => 'GRD-001',
                'address' => 'Grand Anse, True Blue',
                'city' => 'St. Georges',
                'country_code' => 'GD',
                'postal_code' => null,
                'phone' => '+1 (473) 123-4567',
                'email' => 'grenada@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '8:00 AM - 4:00 PM AST',
                    'specializations' => ['Grenada CBI', 'E-2 Visa Pathway'],
                ],
            ],

            // Asia Pacific Offices
            [
                'zone_code' => 'APAC',
                'name' => 'Singapore Office',
                'code' => 'SIN-001',
                'address' => '1 Raffles Place, Tower 2, #40-02',
                'city' => 'Singapore',
                'country_code' => 'SG',
                'postal_code' => '048616',
                'phone' => '+65 6123 4567',
                'email' => 'singapore@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 6:00 PM SGT',
                    'specializations' => ['APAC Immigration', 'Singapore PR'],
                ],
            ],
            [
                'zone_code' => 'APAC',
                'name' => 'Hong Kong Office',
                'code' => 'HKG-001',
                'address' => 'International Commerce Centre, 1 Austin Road West',
                'city' => 'Hong Kong',
                'country_code' => 'HK',
                'postal_code' => null,
                'phone' => '+852 2123 4567',
                'email' => 'hongkong@company.com',
                'is_active' => true,
                'metadata' => [
                    'business_hours' => '9:00 AM - 6:00 PM HKT',
                    'specializations' => ['Hong Kong Immigration', 'China Desk'],
                ],
            ],
        ];

        foreach ($offices as $officeData) {
            $zoneCode = $officeData['zone_code'];
            unset($officeData['zone_code']);

            $zone = $zones->get($zoneCode);

            if ($zone) {
                $data = array_merge($officeData, ['zone_id' => $zone->id]);
                Office::updateOrCreate(
                    ['code' => $data['code']],
                    $data,
                );
            }
        }
    }
}
