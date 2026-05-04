<?php

namespace App\Http\Controllers;

use App\Models\Team;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class CurrentTeamController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'team_id' => ['required', 'integer'],
        ]);

        $team = Team::findOrFail($validated['team_id']);

        if (! $request->user()->switchTeam($team)) {
            abort(403, 'You do not belong to this team.');
        }

        return redirect(session()->get('url.intended', route('dashboard')), 303);
    }
}
