<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Province;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        // Get provinces
        $california = Province::where('code', 'CA')->first();
        $texas = Province::where('code', 'TX')->first();
        $florida = Province::where('code', 'FL')->first();
        $newYork = Province::where('code', 'NY')->first();
        $ontario = Province::where('code', 'ON')->first();
        $quebec = Province::where('code', 'QC')->first();
        $dubai = Province::where('code', 'DU')->first();
        $abuDhabi = Province::where('code', 'AZ')->first();

        $cities = [];

        // California Cities
        if ($california) {
            $californiaCities = [
                ['province_id' => $california->id, 'name' => 'Los Angeles', 'code' => 'LA', 'latitude' => 34.0522, 'longitude' => -118.2437, 'is_active' => true],
                ['province_id' => $california->id, 'name' => 'San Francisco', 'code' => 'SF', 'latitude' => 37.7749, 'longitude' => -122.4194, 'is_active' => true],
                ['province_id' => $california->id, 'name' => 'San Diego', 'code' => 'SD', 'latitude' => 32.7157, 'longitude' => -117.1611, 'is_active' => true],
                ['province_id' => $california->id, 'name' => 'San Jose', 'code' => 'SJ', 'latitude' => 37.3382, 'longitude' => -121.8863, 'is_active' => true],
            ];
            $cities = array_merge($cities, $californiaCities);
        }

        // Texas Cities
        if ($texas) {
            $texasCities = [
                ['province_id' => $texas->id, 'name' => 'Houston', 'code' => 'HOU', 'latitude' => 29.7604, 'longitude' => -95.3698, 'is_active' => true],
                ['province_id' => $texas->id, 'name' => 'Dallas', 'code' => 'DAL', 'latitude' => 32.7767, 'longitude' => -96.7970, 'is_active' => true],
                ['province_id' => $texas->id, 'name' => 'Austin', 'code' => 'AUS', 'latitude' => 30.2672, 'longitude' => -97.7431, 'is_active' => true],
                ['province_id' => $texas->id, 'name' => 'San Antonio', 'code' => 'SAT', 'latitude' => 29.4241, 'longitude' => -98.4936, 'is_active' => true],
            ];
            $cities = array_merge($cities, $texasCities);
        }

        // Florida Cities
        if ($florida) {
            $floridaCities = [
                ['province_id' => $florida->id, 'name' => 'Miami', 'code' => 'MIA', 'latitude' => 25.7617, 'longitude' => -80.1918, 'is_active' => true],
                ['province_id' => $florida->id, 'name' => 'Orlando', 'code' => 'ORL', 'latitude' => 28.5383, 'longitude' => -81.3792, 'is_active' => true],
                ['province_id' => $florida->id, 'name' => 'Tampa', 'code' => 'TPA', 'latitude' => 27.9506, 'longitude' => -82.4572, 'is_active' => true],
                ['province_id' => $florida->id, 'name' => 'Jacksonville', 'code' => 'JAX', 'latitude' => 30.3322, 'longitude' => -81.6557, 'is_active' => true],
            ];
            $cities = array_merge($cities, $floridaCities);
        }

        // New York Cities
        if ($newYork) {
            $newYorkCities = [
                ['province_id' => $newYork->id, 'name' => 'New York City', 'code' => 'NYC', 'latitude' => 40.7128, 'longitude' => -74.0060, 'is_active' => true],
                ['province_id' => $newYork->id, 'name' => 'Buffalo', 'code' => 'BUF', 'latitude' => 42.8864, 'longitude' => -78.8784, 'is_active' => true],
                ['province_id' => $newYork->id, 'name' => 'Rochester', 'code' => 'ROC', 'latitude' => 43.1566, 'longitude' => -77.6088, 'is_active' => true],
            ];
            $cities = array_merge($cities, $newYorkCities);
        }

        // Ontario Cities
        if ($ontario) {
            $ontarioCities = [
                ['province_id' => $ontario->id, 'name' => 'Toronto', 'code' => 'TOR', 'latitude' => 43.6532, 'longitude' => -79.3832, 'is_active' => true],
                ['province_id' => $ontario->id, 'name' => 'Ottawa', 'code' => 'OTT', 'latitude' => 45.4215, 'longitude' => -75.6972, 'is_active' => true],
                ['province_id' => $ontario->id, 'name' => 'Mississauga', 'code' => 'MIS', 'latitude' => 43.5890, 'longitude' => -79.6441, 'is_active' => true],
            ];
            $cities = array_merge($cities, $ontarioCities);
        }

        // Quebec Cities
        if ($quebec) {
            $quebecCities = [
                ['province_id' => $quebec->id, 'name' => 'Montreal', 'code' => 'MTL', 'latitude' => 45.5017, 'longitude' => -73.5673, 'is_active' => true],
                ['province_id' => $quebec->id, 'name' => 'Quebec City', 'code' => 'QBC', 'latitude' => 46.8139, 'longitude' => -71.2080, 'is_active' => true],
            ];
            $cities = array_merge($cities, $quebecCities);
        }

        // Dubai Cities
        if ($dubai) {
            $dubaiCities = [
                ['province_id' => $dubai->id, 'name' => 'Dubai', 'code' => 'DXB', 'latitude' => 25.2048, 'longitude' => 55.2708, 'is_active' => true],
            ];
            $cities = array_merge($cities, $dubaiCities);
        }

        // Abu Dhabi Cities
        if ($abuDhabi) {
            $abuDhabiCities = [
                ['province_id' => $abuDhabi->id, 'name' => 'Abu Dhabi', 'code' => 'AUH', 'latitude' => 24.4539, 'longitude' => 54.3773, 'is_active' => true],
            ];
            $cities = array_merge($cities, $abuDhabiCities);
        }

        foreach ($cities as $cityData) {
            City::create($cityData);
        }
    }
}
