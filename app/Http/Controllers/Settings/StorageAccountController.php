<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StorageAccountController extends Controller
{
    public function index(): Response
    {
        $accounts = $this->getFormattedAccounts();

        return Inertia::render('settings/storage-accounts', [
            'storageAccounts' => $accounts,
        ]);
    }

    public function api(): JsonResponse
    {
        return response()->json([
            'data' => $this->getFormattedAccounts(),
        ]);
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function getFormattedAccounts()
    {
        return Auth::user()->storageAccounts()
            ->active()
            ->get()
            ->map(fn ($account) => [
                'id' => $account->id,
                'provider' => $account->provider,
                'provider_account_email' => $account->provider_account_email,
                'provider_account_name' => $account->provider_account_name,
                'is_active' => $account->is_active,
                'created_at' => $account->created_at->toISOString(),
            ]);
    }
}
