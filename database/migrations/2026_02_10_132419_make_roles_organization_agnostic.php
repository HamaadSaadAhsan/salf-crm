<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Make all roles organization-agnostic (global) so they work across all teams.
     *
     * In Spatie Permission with teams enabled, roles with organization_id = NULL
     * are treated as global and available to all organizations.
     */
    public function up(): void
    {
        DB::table('roles')->whereNotNull('organization_id')->update(['organization_id' => null]);
    }

    public function down(): void
    {
        // Restore roles to org 1 (the original default)
        DB::table('roles')->whereNull('organization_id')->update(['organization_id' => 1]);
    }
};
