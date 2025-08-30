<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@saadahsancrm.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Create manager users
        $manager1 = User::firstOrCreate(
            ['email' => 'manager1@saadahsancrm.com'],
            [
                'name' => 'Sarah Johnson',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $manager2 = User::firstOrCreate(
            ['email' => 'manager2@saadahsancrm.com'],
            [
                'name' => 'Mike Chen',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Create sales representatives
        $salesRep1 = User::firstOrCreate(
            ['email' => 'sales1@saadahsancrm.com'],
            [
                'name' => 'John Smith',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $salesRep2 = User::firstOrCreate(
            ['email' => 'sales2@saadahsancrm.com'],
            [
                'name' => 'Emily Davis',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $salesRep3 = User::firstOrCreate(
            ['email' => 'sales3@saadahsancrm.com'],
            [
                'name' => 'David Wilson',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $salesRep4 = User::firstOrCreate(
            ['email' => 'sales4@saadahsancrm.com'],
            [
                'name' => 'Lisa Rodriguez',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Create support users
        $support1 = User::firstOrCreate(
            ['email' => 'support1@saadahsancrm.com'],
            [
                'name' => 'Alex Brown',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        $support2 = User::firstOrCreate(
            ['email' => 'support2@saadahsancrm.com'],
            [
                'name' => 'Maria Garcia',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Create test user (for development)
        $testUser = User::firstOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );

        // Create demo users for different regions
        $demoUsers = [
            [
                'name' => 'Ahmed Hassan',
                'email' => 'ahmed.hassan@saadahsancrm.com',
                'region' => 'Middle East'
            ],
            [
                'name' => 'Sophie Martin',
                'email' => 'sophie.martin@saadahsancrm.com',
                'region' => 'Europe'
            ],
            [
                'name' => 'Raj Patel',
                'email' => 'raj.patel@saadahsancrm.com',
                'region' => 'Asia'
            ],
            [
                'name' => 'Carlos Silva',
                'email' => 'carlos.silva@saadahsancrm.com',
                'region' => 'Americas'
            ]
        ];

        foreach ($demoUsers as $userData) {
            User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => Hash::make('password123'),
                    'email_verified_at' => now(),
                ]
            );
        }

        // Assign roles if they exist
        $this->assignRolesIfExist([
            $admin->email => 'admin',
            $manager1->email => 'manager',
            $manager2->email => 'manager',
            $salesRep1->email => 'sales',
            $salesRep2->email => 'sales',
            $salesRep3->email => 'sales',
            $salesRep4->email => 'sales',
            $support1->email => 'support',
            $support2->email => 'support',
            $testUser->email => 'sales', // Give test user basic sales access
        ]);

        $this->command->info('Created ' . User::count() . ' users successfully');
    }

    /**
     * Assign roles to users if roles exist in the system
     */
    private function assignRolesIfExist(array $userRoles): void
    {
        foreach ($userRoles as $email => $roleName) {
            $user = User::where('email', $email)->first();

            if ($user && class_exists('\Spatie\Permission\Models\Role')) {
                try {
                    $role = Role::where('name', $roleName)->first();
                    if ($role) {
                        $user->assignRole($role);
                        $this->command->info("Assigned role '{$roleName}' to {$user->name}");
                    }
                } catch (\Exception $e) {
                    $this->command->warn("Could not assign role '{$roleName}' to {$user->name}: " . $e->getMessage());
                }
            }
        }
    }
}
