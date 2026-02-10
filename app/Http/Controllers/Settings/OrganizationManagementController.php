<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationManagementController extends Controller
{
    public function index(): Response
    {
        $organizations = Organization::query()
            ->with('owner:id,name,email')
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(fn (Organization $org) => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
                'logo' => $org->logo,
                'is_active' => $org->is_active,
                'users_count' => $org->users_count,
                'owner' => $org->owner ? [
                    'id' => $org->owner->id,
                    'name' => $org->owner->name,
                    'email' => $org->owner->email,
                ] : null,
                'created_at' => $org->created_at?->toISOString(),
            ]);

        $users = User::query()
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('settings/management/organizations/index', [
            'organizations' => $organizations,
            'users' => $users,
        ]);
    }
}
