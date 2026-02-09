<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Location Hierarchy (must be first)
        $this->call([
            CountrySeeder::class,
            ProvinceSeeder::class,
            CitySeeder::class,
            ZoneSeeder::class,
            OfficeSeeder::class,
        ]);

        // Core Application Data
        $this->call([
            StatusSeeder::class,
            ServiceSeeder::class,
            LeadSourceSeeder::class,
        ]);

        // Users, Roles and Permissions
        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            TicketsLeadsPermissionsSeeder::class,
        ]);

        // Leads and Related Data
        $this->call([
//            LeadSeeder::class,
            InboundCallLeadSourceSeeder::class,
        ]);

        // Analytics and Metrics (last)
        $this->call([
            LeadConversionSeeder::class,
            MetricsSeeder::class,
        ]);
    }
}
