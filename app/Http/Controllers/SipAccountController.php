<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSipAccountRequest;
use App\Jobs\RegisterSipAccount;
use App\Models\CallSession;
use App\Models\SipAccount;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SipAccountController extends Controller
{
    public function index(Request $request): Response
    {
        $query = auth()->user()->sipAccounts()->with('user')->latest();

        if ($search = $request->string('search')->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                    ->orWhere('domain', 'like', "%{$search}%")
                    ->orWhere('display_name', 'like', "%{$search}%");
            });
        }

        if ($status = $request->string('status')->toString()) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        if (! is_null($request->query('enabled'))) {
            $enabled = $request->boolean('enabled');
            $query->where('is_enabled', $enabled);
        }

        $sipAccounts = $query->get();

        return Inertia::render('sipaccounts/index', [
            'sipAccounts' => $sipAccounts,
            'filters' => [
                'search' => $request->query('search'),
                'status' => $request->query('status', 'all'),
                'enabled' => $request->query('enabled'),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('sipaccounts/create');
    }

    public function store(StoreSipAccountRequest $request): RedirectResponse
    {
        $sipAccount = auth()->user()->sipAccounts()->create([
            ...$request->validated(),
            'password' => bcrypt($request->password),
        ]);

        // Queue registration job
        RegisterSipAccount::dispatch($sipAccount);

        return redirect()
            ->route('sip-accounts.index')
            ->with('success', 'SIP account created successfully and registration queued.');
    }

    public function show(SipAccount $sipAccount): Response
    {
        $this->authorize('view', $sipAccount);

        $sipAccount->load(['user', 'callParticipants']);

        return Inertia::render('sipaccounts/show', [
            'sipAccount' => $sipAccount,
            'recentCalls' => CallSession::where('caller_id', $sipAccount->user_id)
                ->with(['caller', 'lead'])
                ->latest()
                ->limit(10)
                ->get(),
        ]);
    }

    public function edit(SipAccount $sipAccount): Response
    {
        $this->authorize('update', $sipAccount);

        return Inertia::render('sipaccounts/edit', [
            'sipAccount' => $sipAccount->makeHidden('password'),
        ]);
    }

    public function update(StoreSipAccountRequest $request, SipAccount $sipAccount): RedirectResponse
    {
        $this->authorize('update', $sipAccount);

        $updateData = $request->validated();

        if ($request->has('password') && $request->password) {
            $updateData['password'] = bcrypt($request->password);
        } else {
            unset($updateData['password']);
        }

        $sipAccount->update($updateData);

        // Re-register if enabled
        if ($sipAccount->is_enabled) {
            RegisterSipAccount::dispatch($sipAccount, true);
        }

        return redirect()
            ->route('sip-accounts.index')
            ->with('success', 'SIP account updated successfully.');
    }

    public function destroy(SipAccount $sipAccount): RedirectResponse
    {
        $this->authorize('delete', $sipAccount);

        $sipAccount->delete();

        return redirect()
            ->route('sip-accounts.index')
            ->with('success', 'SIP account deleted successfully.');
    }

    public function register(SipAccount $sipAccount): RedirectResponse
    {
        $this->authorize('update', $sipAccount);

        RegisterSipAccount::dispatch($sipAccount, true);

        return back()->with('success', 'SIP account registration queued.');
    }

    public function toggle(SipAccount $sipAccount): RedirectResponse
    {
        $this->authorize('update', $sipAccount);

        $sipAccount->update([
            'is_enabled' => ! $sipAccount->is_enabled,
        ]);

        if ($sipAccount->is_enabled) {
            RegisterSipAccount::dispatch($sipAccount);
            $message = 'SIP account enabled and registration queued.';
        } else {
            $message = 'SIP account disabled.';
        }

        return back()->with('success', $message);
    }
}
