<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class TeamController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Team::class);

        $teams = Team::withoutGlobalScopes()
            ->withCount(['members', 'invitations'])
            ->with('owner:id,name,email')
            ->when($request->search, fn ($q) => $q->where('name', 'ilike', "%{$request->search}%"))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25))
            ->withQueryString();

        return inertia('Teams/Index', [
            'teams' => $teams,
            'filters' => $request->only('search', 'per_page'),
        ]);
    }

    public function create(): Response
    {
        return inertia('Teams/Create');
    }

    public function current(Request $request): Response|RedirectResponse
    {
        $team = $request->user()?->currentTeam;

        if (! $team) {
            return redirect()->route('teams.create');
        }

        return $this->show($team);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorize('create', Team::class);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $team = $request->user()->ownedTeams()->create([
            'name' => $validated['name'],
            'personal_team' => false,
        ]);

        $request->user()->switchTeam($team);

        return redirect()->route('teams.show', $team)
            ->with('success', 'Team created.');
    }

    public function show(Team $team): Response
    {
        $this->authorize('view', $team);

        $team->load(['owner', 'members', 'invitations']);

        return inertia('Teams/Show', [
            'team' => $team,
        ]);
    }

    public function update(Request $request, Team $team): RedirectResponse
    {
        $this->authorize('update', $team);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $team->update($validated);

        return back()->with('success', 'Team updated.');
    }

    public function destroy(Team $team): RedirectResponse
    {
        $this->authorize('delete', $team);

        $team->delete();

        return redirect()->route('dashboard')
            ->with('success', 'Team deleted.');
    }
}
