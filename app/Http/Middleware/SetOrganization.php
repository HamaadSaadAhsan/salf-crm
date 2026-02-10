<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Services\Tenancy\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

readonly class SetOrganization
{
    public function __construct(private TenantManager $tenantManager) {}

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $organization = $this->resolveOrganization($request, $user);

        if ($organization) {
            $this->tenantManager->set($organization);

            // Store in session for subsequent requests
            session(['current_organization_id' => $organization->id]);

            // Share with Inertia
            Inertia::share('currentOrganization', fn () => $organization->only(['id', 'name', 'slug', 'logo']));
        }

        return $next($request);
    }

    private function resolveOrganization(Request $request, $user): ?Organization
    {
        // Eager-load organizations once to avoid N+1 on every request
        if (! $user->relationLoaded('organizations')) {
            $user->load('organizations');
        }

        $userOrgs = $user->organizations;

        // 1. API header
        if ($headerOrgId = $request->header('X-Organization-Id')) {
            $org = $userOrgs->firstWhere('id', (int) $headerOrgId);
            if ($org) {
                return $org;
            }
        }

        // 2. Session
        if ($sessionOrgId = session('current_organization_id')) {
            $org = $userOrgs->firstWhere('id', (int) $sessionOrgId);
            if ($org) {
                return $org;
            }
        }

        // 3. User's default organization
        $defaultOrg = $userOrgs->firstWhere('pivot.is_default', true);
        if ($defaultOrg) {
            return $defaultOrg;
        }

        // 4. User's first organization
        return $userOrgs->first();
    }
}
