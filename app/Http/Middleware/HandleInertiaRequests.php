<?php

namespace App\Http\Middleware;

use App\Http\Controllers\ImpersonationController;
use App\Models\Country;
use App\Models\LeadSource;
use App\Models\Service;
use App\Models\Status;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared once and remembered client-side.
     *
     * @return array<string, mixed>
     */
    public function shareOnce(Request $request): array
    {
        return array_merge(parent::shareOnce($request), [
            'countries' => fn () => Country::query()
                ->withCount('provinces')
                ->orderBy('name')
                ->get()
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'code' => $c->code,
                    'iso2' => $c->iso2,
                    'phone_code' => $c->phone_code,
                    'currency' => $c->currency,
                    'currency_symbol' => $c->currency_symbol,
                    'is_active' => $c->is_active,
                    'provinces_count' => $c->provinces_count,
                ]),
            'statuses' => fn () => Status::query()
                ->select(['id', 'name', 'order', 'color'])
                ->orderBy('order')
                ->get(),
            'services' => fn () => Service::query()
                ->select(['id', 'name', 'detail', 'country_code', 'parent_id', 'sort_order', 'status'])
                ->ordered()
                ->get(),
            'sources' => fn () => LeadSource::query()
                ->select(['id', 'name', 'slug'])
                ->active()
                ->ordered()
                ->get(),
        ]);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();
        $user?->loadMissing('roles:id,name');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
                'isSuperAdmin' => $user?->hasRole('super-admin') ?? false,
            ],
            'impersonation' => [
                'isImpersonating' => ImpersonationController::isImpersonating(),
                'impersonator' => ImpersonationController::getImpersonator(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
