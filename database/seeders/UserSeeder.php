<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create only the initial super admin user
        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@saadahsancrm.com'],
            [
                'name' => 'Super Admin',
                'password' => 'password123',
                'email_verified_at' => now(),
            ]
        );

        // Assign super-admin role if it exists
        $this->assignRolesIfExist([
            $superAdmin->email => 'super-admin',
        ]);

        $this->command->info('Ensured super admin user exists successfully');
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
                    $this->command->warn("Could not assign role '{$roleName}' to {$user->name}: ".$e->getMessage());
                }
            }
        }
    }
}
