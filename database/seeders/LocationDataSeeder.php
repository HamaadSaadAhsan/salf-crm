<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Country;
use App\Models\Province;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LocationDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Paste your data here as an array
        // Format: [country, province, city]
        $locationData = $this->getLocationData();

        DB::beginTransaction();

        try {
            $countries = [];
            $provinces = [];
            $cities = [];

            // First pass: collect unique countries, provinces, and cities
            foreach ($locationData as $row) {
                $countryName = trim($row[0]);
                $provinceName = isset($row[1]) ? trim($row[1]) : null;
                $cityName = isset($row[2]) ? trim($row[2]) : null;

                // Skip if no country or city
                if (empty($countryName) || empty($cityName)) {
                    continue;
                }

                // Normalize province name (handle NULL, 0, empty)
                if (empty($provinceName) || $provinceName === 'NULL' || $provinceName === '0') {
                    $provinceName = 'General';
                }

                // Store unique combinations
                if (! isset($countries[$countryName])) {
                    $countries[$countryName] = [
                        'name' => $countryName,
                        'code' => $this->generateCountryCode($countryName),
                        'iso2' => $this->getISO2Code($countryName),
                    ];
                }

                $provinceKey = $countryName.'|'.$provinceName;
                if (! isset($provinces[$provinceKey])) {
                    $provinces[$provinceKey] = [
                        'country' => $countryName,
                        'name' => $provinceName,
                    ];
                }

                $cities[] = [
                    'country' => $countryName,
                    'province' => $provinceName,
                    'city' => $cityName,
                ];
            }

            $this->command->info('Processing '.count($countries).' countries...');

            // Insert countries
            $countryIds = [];
            foreach ($countries as $countryName => $countryData) {
                $country = Country::firstOrCreate(
                    ['name' => $countryData['name']],
                    [
                        'code' => $countryData['code'],
                        'iso2' => $countryData['iso2'],
                        'is_active' => true,
                    ]
                );
                $countryIds[$countryName] = $country->id;
            }

            $this->command->info('Processing '.count($provinces).' provinces...');

            // Insert provinces
            $provinceIds = [];
            foreach ($provinces as $provinceKey => $provinceData) {
                $countryId = $countryIds[$provinceData['country']];
                $province = Province::firstOrCreate(
                    [
                        'country_id' => $countryId,
                        'name' => $provinceData['name'],
                    ],
                    [
                        'is_active' => true,
                    ]
                );
                $provinceIds[$provinceKey] = $province->id;
            }

            $this->command->info('Processing '.count($cities).' cities...');

            // Insert cities
            $bar = $this->command->getOutput()->createProgressBar(count($cities));
            $bar->start();

            foreach ($cities as $cityData) {
                $provinceKey = $cityData['country'].'|'.$cityData['province'];
                $provinceId = $provinceIds[$provinceKey];

                City::firstOrCreate(
                    [
                        'province_id' => $provinceId,
                        'name' => $cityData['city'],
                    ],
                    [
                        'is_active' => true,
                    ]
                );

                $bar->advance();
            }

            $bar->finish();
            $this->command->newLine();

            DB::commit();

            $this->command->info('Successfully imported location data!');
            $this->command->info('Countries: '.Country::count());
            $this->command->info('Provinces: '.Province::count());
            $this->command->info('Cities: '.City::count());
        } catch (\Exception $e) {
            DB::rollBack();
            $this->command->error('Import failed: '.$e->getMessage());
            throw $e;
        }
    }

    /**
     * Get location data from your provided data
     * Format: [country, province, city]
     */
    private function getLocationData(): array
    {
        // Use CSV file for large datasets
        return $this->readFromCSV();

        // Or paste your data directly here for small datasets:
        // return [
        //     ['Pakistan', 'Islamabad', 'Islamabad'],
        //     ['Pakistan', 'Sindh', 'Karachi'],
        //     ['Pakistan', 'Punjab', 'Lahore'],
        //     // ... more cities
        // ];
    }

    /**
     * Read location data from CSV file
     */
    private function readFromCSV(): array
    {
        $file = storage_path('app/locations.csv');

        if (! file_exists($file)) {
            $this->command->error('CSV file not found at: '.$file);

            return [];
        }

        $data = [];
        $handle = fopen($file, 'r');

        // Skip header if exists
        fgetcsv($handle);

        while (($row = fgetcsv($handle)) !== false) {
            // Assuming CSV format: id, country, province, city, created_at, updated_at
            if (count($row) >= 4) {
                $data[] = [
                    $row[1], // country
                    $row[2], // province
                    $row[3], // city
                ];
            }
        }

        fclose($handle);

        return $data;
    }

    /**
     * Generate a country code from country name
     */
    private function generateCountryCode(string $countryName): string
    {
        return strtoupper(substr($countryName, 0, 3));
    }

    /**
     * Get ISO2 code for known countries
     */
    private function getISO2Code(string $countryName): ?string
    {
        $iso2Codes = [
            'Pakistan' => 'PK',
            'United Kingdom' => 'GB',
            'Portugal' => 'PT',
            'United Arab Emirates' => 'AE',
            'United States' => 'US',
            'International' => null,
        ];

        return $iso2Codes[$countryName] ?? null;
    }
}
