<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        // Parent categories (no parent_id)
        $parents = [
            ['name' => 'Real Estate', 'sort_order' => 0],
            ['name' => 'CBI Programs', 'sort_order' => 1],
            ['name' => 'RBI Programs', 'sort_order' => 2],
            ['name' => 'Business Immigration', 'sort_order' => 3],
            ['name' => 'Skilled Immigration', 'sort_order' => 4],
            ['name' => 'Visit Visa', 'sort_order' => 4],
            ['name' => 'Study Visa', 'sort_order' => 4],
            ['name' => 'Work Permit', 'sort_order' => 4],
            ['name' => 'Citizenship', 'sort_order' => 4],
            ['name' => 'Residency', 'sort_order' => 4],
        ];

        foreach ($parents as $parent) {
            Service::updateOrCreate(
                ['name' => $parent['name']],
                [
                    'sort_order' => $parent['sort_order'],
                    'status' => 'active',
                    'parent_id' => null,
                ]
            );
        }

        // Children under CBI Programs
        $cbiParent = Service::where('name', 'CBI Programs')->first();
        $cbiChildren = [
            'Antigua & Barbuda',
            'St. Kitts and Nevis',
            'Grenada',
            'Saint Lucia',
            'Commonwealth Of Dominica',
            'Turkish',
            'Nauru',
        ];

        foreach ($cbiChildren as $index => $name) {
            Service::updateOrCreate(
                ['name' => $name],
                [
                    'parent_id' => $cbiParent->id,
                    'sort_order' => $index,
                    'status' => 'active',
                ]
            );
        }

        // Children under RBI Programs
        $rbiParent = Service::where('name', 'RBI Programs')->first();
        $rbiChildren = [
            'Dubai - Golden Visa',
            'Portugal Golden Visa',
            'Malta Permanent Residency',
            'Spain Golden Visa',
            'Greece Residency',
            'Hungary Golden Visa',
            'D7 Passive Income',
            'D2 Entrepreneur Visa',
            'Latvia Permanent Residency',
            'D8 Digital Nomad',
        ];

        foreach ($rbiChildren as $index => $name) {
            Service::updateOrCreate(
                ['name' => $name],
                [
                    'parent_id' => $rbiParent->id,
                    'sort_order' => $index,
                    'status' => 'active',
                ]
            );
        }

        // Children under Business Immigration
        $businessParent = Service::where('name', 'Business Immigration')->first();
        $businessChildren = [
            'EB5 Visa',
            'E2 Visa',
            'UK Self Sponsored',
            'UK Innovator',
            'Dubai Investor Visa',
            'Canadian Business Immigration',
            'Personal Reference',
            'Client Reference',
            'Walk-in Client',
        ];

        foreach ($businessChildren as $index => $name) {
            Service::updateOrCreate(
                ['name' => $name],
                [
                    'parent_id' => $businessParent->id,
                    'sort_order' => $index,
                    'status' => 'active',
                ]
            );
        }

        // Children under Skilled Immigration
        $skilledParent = Service::where('name', 'Skilled Immigration')->first();
        $skilledChildren = [
            'Canada Skilled Immigration',
            'Australia Skilled Immigration',
        ];

        foreach ($skilledChildren as $index => $name) {
            Service::updateOrCreate(
                ['name' => $name],
                [
                    'parent_id' => $skilledParent->id,
                    'sort_order' => $index,
                    'status' => 'active',
                ]
            );
        }
    }
}
