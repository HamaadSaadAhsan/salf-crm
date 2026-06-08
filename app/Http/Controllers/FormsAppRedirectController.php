<?php

namespace App\Http\Controllers;

use App\Services\Forms\FormsAppClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controller;

/**
 * Hand-off from the CRM into the standalone forms-app. Mints a short-lived
 * JWT for the current user and 302s into forms-app's UI gate, which swaps
 * the token for a session cookie on first hit. From the user's POV it's a
 * single seamless click.
 */
class FormsAppRedirectController extends Controller
{
    public function __construct(private readonly FormsAppClient $client) {}

    public function index(): RedirectResponse
    {
        return redirect()->away($this->client->deepLinkUrl('/'));
    }

    public function applications(): RedirectResponse
    {
        return redirect()->away($this->client->deepLinkUrl('/applications'));
    }
}
