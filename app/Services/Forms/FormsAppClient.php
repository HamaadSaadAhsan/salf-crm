<?php

namespace App\Services\Forms;

use Firebase\JWT\JWT;
use Illuminate\Contracts\Cache\Repository as CacheRepository;
use Illuminate\Http\Client\Factory as HttpClient;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Client for the standalone forms-app service (the new Laravel service that
 * took over programs / templates / applications / generations from the CRM).
 *
 * Auth is HS256 JWT signed with the shared FORMS_JWT_SECRET. We cache the
 * minted token per-user for slightly under its TTL, so a burst of calls
 * within a request doesn't re-encode the same payload.
 *
 * The actor identity carried by the JWT — `sub`, `name`, `roles` — is what
 * forms-app records as `created_by_user_id` / `created_by_name` on any rows
 * it writes on behalf of this CRM user.
 */
class FormsAppClient
{
    public function __construct(
        private readonly HttpClient $http,
        private readonly CacheRepository $cache,
    ) {}

    /**
     * Generic forward: replays the current request (method + body) at the
     * given forms-app path and returns forms-app's response verbatim —
     * including status code, so 422/404/etc. surface to the original caller
     * unchanged. Use from controller methods to make the swap one-liners.
     */
    public function proxy(Request $request, string $path): JsonResponse
    {
        $url = $this->url($path);
        $pending = $this->request();
        $body = $request->all();

        $response = match (strtoupper($request->method())) {
            'GET' => $pending->get($url, $request->query()),
            'POST' => $pending->post($url, $body),
            'PUT' => $pending->put($url, $body),
            'PATCH' => $pending->patch($url, $body),
            'DELETE' => $pending->delete($url, $body),
            default => abort(405, 'Unsupported method for forms-app proxy: '.$request->method()),
        };

        $json = $response->json();

        return response()->json(
            is_array($json) ? $json : new \stdClass,
            $response->status(),
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function applicationsForLead(string $leadId): array
    {
        $response = $this->request()
            ->get($this->url("/api/leads/{$leadId}/forms/applications"))
            ->throw()
            ->json('data', []);

        return is_array($response) ? $response : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function generationsForApplication(string $leadId, int $applicationId): array
    {
        $response = $this->request()
            ->get($this->url("/api/leads/{$leadId}/forms/applications/{$applicationId}/generations"))
            ->throw()
            ->json('data', []);

        return is_array($response) ? $response : [];
    }

    /**
     * Build a deep-link URL into the forms-app UI carrying a short-lived JWT
     * in the query string. The forms-app's ExchangeJwtForSession middleware
     * swaps it for a session cookie on first hit.
     */
    public function deepLinkUrl(string $path = '/'): string
    {
        $token = $this->tokenForCurrentUser();
        $base = rtrim((string) config('services.forms_app.url'), '/');
        $path = '/'.ltrim($path, '/');

        return $base.$path.(str_contains($path, '?') ? '&' : '?').'token='.$token;
    }

    /**
     * URL the browser can hit directly to download a generation bundle.
     * Token rides in the query string for the browser; the forms-app's
     * VerifyCrmJwt middleware also accepts session, but for an anchor-tag
     * download we need a stateless URL.
     */
    public function downloadUrl(string $leadId, int $generationId): string
    {
        $token = $this->tokenForCurrentUser();
        $base = rtrim((string) config('services.forms_app.url'), '/');

        return "{$base}/api/leads/{$leadId}/forms/generations/{$generationId}/download?token={$token}";
    }

    /**
     * Mint (or reuse a cached) JWT for the currently-authenticated CRM user.
     * Cache key includes user id + role hash so role changes invalidate.
     */
    public function tokenForCurrentUser(): string
    {
        $user = auth()->user();
        abort_unless($user, 401, 'Cannot mint forms-app token: no authenticated user.');

        $roles = $user->getRoleNames()->all();
        $cacheKey = sprintf(
            'forms_app:jwt:%d:%s',
            $user->id,
            substr(md5(implode(',', $roles)), 0, 8)
        );

        $ttl = (int) config('services.forms_app.jwt.ttl_seconds', 300);
        // Cache slightly under JWT lifetime so we never hand out an
        // expired-on-arrival token.
        $cacheTtl = max(30, $ttl - 30);

        return $this->cache->remember(
            $cacheKey,
            $cacheTtl,
            fn () => $this->encodeToken((int) $user->id, (string) $user->name, $roles)
        );
    }

    /**
     * Stateless variant: mint a JWT for any user without touching auth().
     * Use this from artisan commands or queued jobs where there's no session.
     *
     * @param  list<string>  $roles
     */
    public function tokenForUser(int $userId, string $name, array $roles): string
    {
        return $this->encodeToken($userId, $name, $roles);
    }

    /**
     * @param  list<string>  $roles
     */
    private function encodeToken(int $userId, string $name, array $roles): string
    {
        $secret = (string) config('services.forms_app.jwt.secret');
        abort_unless($secret !== '', 500, 'FORMS_JWT_SECRET is not configured.');

        $now = time();
        $ttl = (int) config('services.forms_app.jwt.ttl_seconds', 300);

        return JWT::encode([
            'iss' => (string) config('services.forms_app.jwt.issuer'),
            'aud' => (string) config('services.forms_app.jwt.audience'),
            'sub' => $userId,
            'name' => $name,
            'roles' => $roles,
            'iat' => $now,
            'exp' => $now + $ttl,
            'jti' => bin2hex(random_bytes(8)),
        ], $secret, 'HS256');
    }

    private function request(): PendingRequest
    {
        return $this->http
            ->withToken($this->tokenForCurrentUser())
            ->acceptJson()
            ->timeout((int) config('services.forms_app.timeout', 15));
    }

    private function url(string $path): string
    {
        return rtrim((string) config('services.forms_app.url'), '/').'/'.ltrim($path, '/');
    }
}
