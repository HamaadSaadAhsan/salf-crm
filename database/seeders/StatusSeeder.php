<?php

namespace Database\Seeders;

use App\Models\Status;
use Illuminate\Database\Seeder;

class StatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $statuses = [
            [
                'name' => 'new',
                'color' => '#3B82F6', // Blue
                'order' => 1,
            ],
            [
                'name' => 'contacted',
                'color' => '#F59E0B', // Yellow
                'order' => 2,
            ],
            [
                'name' => 'qualified',
                'color' => '#8B5CF6', // Purple
                'order' => 3,
            ],
            [
                'name' => 'proposal',
                'color' => '#06B6D4', // Cyan
                'order' => 4,
            ],
            [
                'name' => 'won',
                'color' => '#10B981', // Green
                'order' => 5,
            ],
            [
                'name' => 'lost',
                'color' => '#EF4444', // Red
                'order' => 6,
            ],
            [
                'name' => 'nurturing',
                'color' => '#84CC16', // Lime
                'order' => 7,
            ],
        ];

        foreach ($statuses as $status) {
            Status::firstOrCreate(
                ['name' => $status['name']],
                $status
            );
        }
    }
}
