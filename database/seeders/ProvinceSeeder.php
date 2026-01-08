<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\Province;
use Illuminate\Database\Seeder;

class ProvinceSeeder extends Seeder
{
    public function run(): void
    {
        // Get countries
        $usa = Country::where('code', 'USA')->first();
        $canada = Country::where('code', 'CAN')->first();
        $uk = Country::where('code', 'GBR')->first();
        $uae = Country::where('code', 'ARE')->first();

        $provinces = [];

        // United States - Major States
        if ($usa) {
            $usStates = [
                ['country_id' => $usa->id, 'name' => 'California', 'code' => 'CA', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'Texas', 'code' => 'TX', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'Florida', 'code' => 'FL', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'New York', 'code' => 'NY', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'Illinois', 'code' => 'IL', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'Pennsylvania', 'code' => 'PA', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'Ohio', 'code' => 'OH', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'Georgia', 'code' => 'GA', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'North Carolina', 'code' => 'NC', 'is_active' => true],
                ['country_id' => $usa->id, 'name' => 'Michigan', 'code' => 'MI', 'is_active' => true],
            ];
            $provinces = array_merge($provinces, $usStates);
        }

        // Canada - Provinces
        if ($canada) {
            $canadaProvinces = [
                ['country_id' => $canada->id, 'name' => 'Ontario', 'code' => 'ON', 'is_active' => true],
                ['country_id' => $canada->id, 'name' => 'Quebec', 'code' => 'QC', 'is_active' => true],
                ['country_id' => $canada->id, 'name' => 'British Columbia', 'code' => 'BC', 'is_active' => true],
                ['country_id' => $canada->id, 'name' => 'Alberta', 'code' => 'AB', 'is_active' => true],
                ['country_id' => $canada->id, 'name' => 'Manitoba', 'code' => 'MB', 'is_active' => true],
                ['country_id' => $canada->id, 'name' => 'Saskatchewan', 'code' => 'SK', 'is_active' => true],
            ];
            $provinces = array_merge($provinces, $canadaProvinces);
        }

        // United Kingdom - Countries
        if ($uk) {
            $ukCountries = [
                ['country_id' => $uk->id, 'name' => 'England', 'code' => 'ENG', 'is_active' => true],
                ['country_id' => $uk->id, 'name' => 'Scotland', 'code' => 'SCT', 'is_active' => true],
                ['country_id' => $uk->id, 'name' => 'Wales', 'code' => 'WLS', 'is_active' => true],
                ['country_id' => $uk->id, 'name' => 'Northern Ireland', 'code' => 'NIR', 'is_active' => true],
            ];
            $provinces = array_merge($provinces, $ukCountries);
        }

        // UAE - Emirates
        if ($uae) {
            $emirates = [
                ['country_id' => $uae->id, 'name' => 'Abu Dhabi', 'code' => 'AZ', 'is_active' => true],
                ['country_id' => $uae->id, 'name' => 'Dubai', 'code' => 'DU', 'is_active' => true],
                ['country_id' => $uae->id, 'name' => 'Sharjah', 'code' => 'SH', 'is_active' => true],
                ['country_id' => $uae->id, 'name' => 'Ajman', 'code' => 'AJ', 'is_active' => true],
                ['country_id' => $uae->id, 'name' => 'Ras Al Khaimah', 'code' => 'RK', 'is_active' => true],
                ['country_id' => $uae->id, 'name' => 'Fujairah', 'code' => 'FU', 'is_active' => true],
                ['country_id' => $uae->id, 'name' => 'Umm Al Quwain', 'code' => 'UQ', 'is_active' => true],
            ];
            $provinces = array_merge($provinces, $emirates);
        }

        foreach ($provinces as $provinceData) {
            Province::create($provinceData);
        }
    }
}
