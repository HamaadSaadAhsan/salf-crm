<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        // Create main service categories (parents)
        $citizenshipPrograms = Service::create([
            'name' => 'Citizenship by Investment Programs',
            'detail' => 'Various citizenship programs through investment worldwide',
            'sort_order' => 1,
            'status' => 'active',
        ]);

        $residencyPrograms = Service::create([
            'name' => 'Residency by Investment Programs',
            'detail' => 'Residency programs through investment worldwide',
            'sort_order' => 2,
            'status' => 'active',
        ]);

        $businessServices = Service::create([
            'name' => 'Business Services',
            'detail' => 'Corporate and business-related services',
            'sort_order' => 3,
            'status' => 'active',
        ]);

        // Citizenship by Investment sub-services
        $citizenshipServices = [
            [
                'name' => 'Dominica Citizenship Program',
                'detail' => 'Citizenship through investment in Dominica - Economic Citizenship',
                'country_code' => 'DM',
                'country_name' => 'Dominica',
                'sort_order' => 1,
            ],
            [
                'name' => 'St. Kitts and Nevis Citizenship',
                'detail' => 'Citizenship program for St. Kitts and Nevis through investment',
                'country_code' => 'KN',
                'country_name' => 'St. Kitts and Nevis',
                'sort_order' => 2,
            ],
            [
                'name' => 'Antigua and Barbuda Citizenship',
                'detail' => 'Citizenship by investment program for Antigua and Barbuda',
                'country_code' => 'AG',
                'country_name' => 'Antigua and Barbuda',
                'sort_order' => 3,
            ],
            [
                'name' => 'Grenada Citizenship Program',
                'detail' => 'Grenada citizenship through investment with US E-2 visa access',
                'country_code' => 'GD',
                'country_name' => 'Grenada',
                'sort_order' => 4,
            ],
            [
                'name' => 'St. Lucia Citizenship',
                'detail' => 'St. Lucia citizenship by investment program',
                'country_code' => 'LC',
                'country_name' => 'St. Lucia',
                'sort_order' => 5,
            ],
            [
                'name' => 'Malta Citizenship Program',
                'detail' => 'Malta citizenship by naturalization for exceptional services',
                'country_code' => 'MT',
                'country_name' => 'Malta',
                'sort_order' => 6,
            ],
            [
                'name' => 'Turkey Citizenship Program',
                'detail' => 'Turkish citizenship through real estate investment',
                'country_code' => 'TR',
                'country_name' => 'Turkey',
                'sort_order' => 7,
            ],
        ];

        foreach ($citizenshipServices as $service) {
            Service::create(array_merge($service, [
                'parent_id' => $citizenshipPrograms->id,
                'status' => 'active',
            ]));
        }

        // Residency by Investment sub-services
        $residencyServices = [
            [
                'name' => 'Portugal Golden Visa',
                'detail' => 'Portuguese residency through investment with path to citizenship',
                'country_code' => 'PT',
                'country_name' => 'Portugal',
                'sort_order' => 1,
            ],
            [
                'name' => 'Spain Golden Visa',
                'detail' => 'Spanish residency through real estate investment',
                'country_code' => 'ES',
                'country_name' => 'Spain',
                'sort_order' => 2,
            ],
            [
                'name' => 'Greece Golden Visa',
                'detail' => 'Greek residency through real estate investment',
                'country_code' => 'GR',
                'country_name' => 'Greece',
                'sort_order' => 3,
            ],
            [
                'name' => 'UAE Golden Visa',
                'detail' => 'UAE long-term residency through investment',
                'country_code' => 'AE',
                'country_name' => 'United Arab Emirates',
                'sort_order' => 4,
            ],
            [
                'name' => 'Canada Investment Immigration',
                'detail' => 'Canadian permanent residency through various investment programs',
                'country_code' => 'CA',
                'country_name' => 'Canada',
                'sort_order' => 5,
            ],
            [
                'name' => 'EB-5 USA Investor Visa',
                'detail' => 'US permanent residency through EB-5 investment program',
                'country_code' => 'US',
                'country_name' => 'United States',
                'sort_order' => 6,
            ],
        ];

        foreach ($residencyServices as $service) {
            Service::create(array_merge($service, [
                'parent_id' => $residencyPrograms->id,
                'status' => 'active',
            ]));
        }

        // Business Services sub-services
        $businessSubServices = [
            [
                'name' => 'Company Formation',
                'detail' => 'International company formation and incorporation services',
                'sort_order' => 1,
            ],
            [
                'name' => 'Banking Services',
                'detail' => 'International banking and account opening services',
                'sort_order' => 2,
            ],
            [
                'name' => 'Tax Advisory',
                'detail' => 'International tax planning and advisory services',
                'sort_order' => 3,
            ],
            [
                'name' => 'Legal Consultation',
                'detail' => 'Legal advisory services for immigration and business',
                'sort_order' => 4,
            ],
        ];

        foreach ($businessSubServices as $service) {
            Service::create(array_merge($service, [
                'parent_id' => $businessServices->id,
                'status' => 'active',
            ]));
        }
    }
}
