# FormsAppClient & LeadApplicationController — Code Review

Reviewed: 2026-06-09
Files:
- `app/Services/Forms/FormsAppClient.php`
- `app/Http/Controllers/Api/Forms/LeadApplicationController.php`

---

## FormsAppClient

### [Critical] `request()` unusable from jobs / commands

`applicationsForLead()` and `generationsForApplication()` both call `$this->request()`, which internally calls `tokenForCurrentUser()`, which calls `auth()->user()`. In a queued job or artisan command there is no session, so `auth()->user()` returns `null` and the service aborts with 401.

`tokenForUser(int $userId, string $name, array $roles)` exists as a "stateless variant" but is never wired into `request()` — it is effectively a dead method. Any job that needs to call forms-app cannot use these methods today.

**Fix:** Accept an optional `Authenticatable` on `request()` (or on each public method), falling back to `auth()->user()`. Wire `tokenForUser` into that path.

---

### [Security] JWT exposed in download URL query string

`downloadUrl()` appends a signed JWT to `?token=`. That token will appear in:
- forms-app server access logs
- browser history / bookmarks
- `Referer` header if the page loads external resources
- any CDN or reverse-proxy access log

`deepLinkUrl()` is acceptable because the token is swapped for a session cookie on the first hit. The download URL is not — the exposure window equals the token TTL (default 5 min), and the token is visible in logs indefinitely.

**Fix:** Stream the download through the CRM by sending the JWT in an `Authorization: Bearer` header server-side, or redirect to a short-lived signed storage URL returned by forms-app via an authenticated POST exchange endpoint.

---

### [Minor] `abort()` calls inside service layer

`abort_unless($secret !== '', 500, ...)` and `abort_unless($user, 401, ...)` couple the service to the HTTP request lifecycle. Services should throw domain exceptions; controllers translate them to HTTP responses.

**Fix:** Replace with `throw new \RuntimeException(...)` or a dedicated `FormsAppException`.

---

### [Minor] Duplicate URL building in `deepLinkUrl()` / `downloadUrl()`

Both methods repeat `rtrim(config('services.forms_app.url'), '/')` instead of calling the private `url()` helper that already does this.

---

### [Minor] No resilience on HTTP calls

`->throw()` propagates a raw `ConnectionException` on any network failure. Forms-app being down turns into CRM 500s with no context.

**Fix:** Add a `->retry(2, 100)` for idempotent calls, and catch `ConnectionException` at the controller level to return a meaningful 503 with a user-facing message.

---

### [Minor] Dummy UUID in `programs()` proxy path

`LeadApplicationController::programs()` proxies to `/api/leads/00000000-0000-0000-0000-000000000000/forms/programs`. If forms-app ever validates lead existence, this silently breaks. The endpoint should not require a lead ID at all — fix this at the forms-app API level.

---

## LeadApplicationController

### [Critical] No authorization checks

No `$this->authorize()` or policy calls anywhere. Any authenticated CRM user can create, update, delete, and trigger generation for any lead's applications regardless of their role or ownership. This is the highest-priority gap.

**Fix:** Add a `FormsApplicationPolicy` and call `$this->authorize('create', [$lead, Application::class])` etc. in each method, or use route-level middleware.

---

### [Critical] Dual-mode pattern violates SRP and OCP

Every method contains:

```php
if ($this->proxyEnabled()) {
    return $this->client->proxy(...);
}
// ... legacy local-DB implementation
```

Problems:
- Any new endpoint must be implemented twice.
- Response shape divergence between proxy and local mode is invisible until it breaks in production.
- Removing the legacy path requires touching every method.
- Unit tests must gate on the config flag.

**Fix:** Extract a `LeadApplicationServiceInterface` with `ProxyLeadApplicationService` and `LocalLeadApplicationService` implementations. Bind the correct one in a service provider based on the `services.forms_app.proxy_lead_applications` flag. The controller injects the interface and has no if/else.

---

### [High] Inline validation — violates project conventions

`store()` and `update()` use `$request->validate()` directly. Project conventions require Form Request classes. Additionally, `store()` runs a second `$request->validate(['program_id' => ['exists:programs,id']])` only in legacy mode — split validation logic is confusing and easy to miss.

**Fix:** Create `StoreApplicationRequest` and `UpdateApplicationRequest` in `app/Http/Requests/Api/Forms/`.

---

### [Bug] `array_filter` silently drops explicit nulls in `update()`

```php
$model->update(array_filter([
    'main_applicant_name'     => $request->string('main_applicant_name')->toString() ?: null,
    'main_applicant_passport' => $request->string('main_applicant_passport')->toString() ?: null,
    ...
], fn ($v) => $v !== null));
```

Sending `null` for `main_applicant_passport` to clear it is silently dropped. The field cannot be nulled out.

**Fix:** Build the update array explicitly using `$request->has()` checks per field.

---

### [Minor] N+1 in `downloadGeneration()`

```php
$model = ApplicationGeneration::findOrFail($generation);
abort_if((string) $model->application->lead_id !== (string) $lead->id, 404);
```

`$model->application` lazy-loads a second query.

**Fix:**
```php
$model = ApplicationGeneration::with('application')->findOrFail($generation);
```

---

### [Minor] String coercion for ID comparison

`(string) $model->lead_id !== (string) $lead->id` — coercing to string to compare IDs indicates the types are inconsistent between models. Standardise the ID type (both `int` or both `string`/UUID) and remove the cast.

---

### [Minor] `$request->merge()` mutation before proxy in `store()`

```php
if (! $request->filled('main_applicant_name') && $lead->name) {
    $request->merge(['main_applicant_name' => $lead->name]);
}
return $this->client->proxy($request, ...);
```

Mutating the incoming request object as a side effect before forwarding it is a hidden coupling. Build an explicit payload array and pass it, or add a `data` parameter to `proxy()`.

---

## Priority Order

| Priority | File | Issue |
|----------|------|-------|
| 1 | Controller | No authorization checks |
| 2 | Controller | Dual-mode violates SRP/OCP — extract service interface |
| 3 | Client | JWT in download URL query string |
| 4 | Controller | Inline validation — needs Form Requests |
| 5 | Client | `request()` unusable from jobs / commands |
| 6 | Controller | `array_filter` drops explicit null updates |
| 7 | Controller | N+1 in `downloadGeneration` |
| 8 | Client | `abort()` in service layer |
| 9 | Both | Dummy UUID / programs endpoint design |
| 10 | Client | No HTTP resilience (retry / error wrapping) |