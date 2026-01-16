<?php

namespace Database\Seeders;

use App\Models\Country;
use Illuminate\Database\Seeder;

class CountrySeeder extends Seeder
{
    public function run(): void
    {
        $countries = [
            // North America
            ['name' => 'United States', 'code' => 'USA', 'iso2' => 'US', 'phone_code' => '+1', 'currency' => 'USD', 'currency_symbol' => '$', 'is_active' => true],
            ['name' => 'Canada', 'code' => 'CAN', 'iso2' => 'CA', 'phone_code' => '+1', 'currency' => 'CAD', 'currency_symbol' => '$', 'is_active' => true],
            ['name' => 'Mexico', 'code' => 'MEX', 'iso2' => 'MX', 'phone_code' => '+52', 'currency' => 'MXN', 'currency_symbol' => '$', 'is_active' => true],

            // Europe - Western
            ['name' => 'United Kingdom', 'code' => 'GBR', 'iso2' => 'GB', 'phone_code' => '+44', 'currency' => 'GBP', 'currency_symbol' => '£', 'is_active' => true],
            ['name' => 'France', 'code' => 'FRA', 'iso2' => 'FR', 'phone_code' => '+33', 'currency' => 'EUR', 'currency_symbol' => '€', 'is_active' => true],
            ['name' => 'Germany', 'code' => 'DEU', 'iso2' => 'DE', 'phone_code' => '+49', 'currency' => 'EUR', 'currency_symbol' => '€', 'is_active' => true],
            ['name' => 'Spain', 'code' => 'ESP', 'iso2' => 'ES', 'phone_code' => '+34', 'currency' => 'EUR', 'currency_symbol' => '€', 'is_active' => true],
            ['name' => 'Portugal', 'code' => 'PRT', 'iso2' => 'PT', 'phone_code' => '+351', 'currency' => 'EUR', 'currency_symbol' => '€', 'is_active' => true],

            // Europe - Eastern
            ['name' => 'Poland', 'code' => 'POL', 'iso2' => 'PL', 'phone_code' => '+48', 'currency' => 'PLN', 'currency_symbol' => 'zł', 'is_active' => true],
            ['name' => 'Czech Republic', 'code' => 'CZE', 'iso2' => 'CZ', 'phone_code' => '+420', 'currency' => 'CZK', 'currency_symbol' => 'Kč', 'is_active' => true],
            ['name' => 'Hungary', 'code' => 'HUN', 'iso2' => 'HU', 'phone_code' => '+36', 'currency' => 'HUF', 'currency_symbol' => 'Ft', 'is_active' => true],

            // Middle East
            ['name' => 'United Arab Emirates', 'code' => 'ARE', 'iso2' => 'AE', 'phone_code' => '+971', 'currency' => 'AED', 'currency_symbol' => 'د.إ', 'is_active' => true],
            ['name' => 'Saudi Arabia', 'code' => 'SAU', 'iso2' => 'SA', 'phone_code' => '+966', 'currency' => 'SAR', 'currency_symbol' => 'ر.س', 'is_active' => true],
            ['name' => 'Qatar', 'code' => 'QAT', 'iso2' => 'QA', 'phone_code' => '+974', 'currency' => 'QAR', 'currency_symbol' => 'ر.ق', 'is_active' => true],

            // Caribbean
            ['name' => 'Dominica', 'code' => 'DMA', 'iso2' => 'DM', 'phone_code' => '+1-767', 'currency' => 'XCD', 'currency_symbol' => '$', 'is_active' => true],
            ['name' => 'Saint Kitts and Nevis', 'code' => 'KNA', 'iso2' => 'KN', 'phone_code' => '+1-869', 'currency' => 'XCD', 'currency_symbol' => '$', 'is_active' => true],
            ['name' => 'Antigua and Barbuda', 'code' => 'ATG', 'iso2' => 'AG', 'phone_code' => '+1-268', 'currency' => 'XCD', 'currency_symbol' => '$', 'is_active' => true],
            ['name' => 'Grenada', 'code' => 'GRD', 'iso2' => 'GD', 'phone_code' => '+1-473', 'currency' => 'XCD', 'currency_symbol' => '$', 'is_active' => true],
            ['name' => 'Saint Lucia', 'code' => 'LCA', 'iso2' => 'LC', 'phone_code' => '+1-758', 'currency' => 'XCD', 'currency_symbol' => '$', 'is_active' => true],

            // Asia Pacific
            ['name' => 'China', 'code' => 'CHN', 'iso2' => 'CN', 'phone_code' => '+86', 'currency' => 'CNY', 'currency_symbol' => '¥', 'is_active' => true],
            ['name' => 'Japan', 'code' => 'JPN', 'iso2' => 'JP', 'phone_code' => '+81', 'currency' => 'JPY', 'currency_symbol' => '¥', 'is_active' => true],
            ['name' => 'Pakistan', 'code' => 'PAK', 'iso2' => 'PK', 'phone_code' => '+92', 'currency' => 'PKR', 'currency_symbol' => '₨', 'is_active' => true],
            ['name' => 'Singapore', 'code' => 'SGP', 'iso2' => 'SG', 'phone_code' => '+65', 'currency' => 'SGD', 'currency_symbol' => '$', 'is_active' => true],
            ['name' => 'Australia', 'code' => 'AUS', 'iso2' => 'AU', 'phone_code' => '+61', 'currency' => 'AUD', 'currency_symbol' => '$', 'is_active' => true],

            // South America
            ['name' => 'Brazil', 'code' => 'BRA', 'iso2' => 'BR', 'phone_code' => '+55', 'currency' => 'BRL', 'currency_symbol' => 'R$', 'is_active' => true],
            ['name' => 'Argentina', 'code' => 'ARG', 'iso2' => 'AR', 'phone_code' => '+54', 'currency' => 'ARS', 'currency_symbol' => '$', 'is_active' => true],
            ['name' => 'Chile', 'code' => 'CHL', 'iso2' => 'CL', 'phone_code' => '+56', 'currency' => 'CLP', 'currency_symbol' => '$', 'is_active' => true],

            // Africa
            ['name' => 'South Africa', 'code' => 'ZAF', 'iso2' => 'ZA', 'phone_code' => '+27', 'currency' => 'ZAR', 'currency_symbol' => 'R', 'is_active' => true],
        ];

        foreach ($countries as $countryData) {
            Country::create($countryData);
        }
    }
}
