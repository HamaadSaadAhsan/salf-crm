# AGENTS.md — SALF CRM v2

> Agent-facing business logic and codebase reference. Read this before touching any domain code. This supplements CLAUDE.md — do not replace it.

---

## Product in One Paragraph

SALF CRM v2 is a sales-team CRM for managing leads from capture through conversion. Three main actors: **CROs** (Customer Relations Officers) qualify inbound leads; **Advisors** (sales reps) work qualified leads toward conversion; **Super Admins** own configuration, teams, and permissions. The system auto-assigns leads using a weighted round-robin algorithm, routes VoIP calls through Asterisk PBX, syncs leads from Facebook, and enforces multi-team data isolation.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| PHP runtime | PHP | 8.3 |
| Framework | Laravel | 13.x |
| Database | PostgreSQL | — |
| Search | Meilisearch via Scout | — |
| Queue monitoring | Laravel Horizon | 5.x |
| WebSockets | Laravel Reverb | 1.x |
| Roles/permissions | Spatie Permission | 6.x |
| Audit logging | Spatie Activity Log | 4.x |
| File management | Spatie Media Library | 11.x |
| AI integration | laravel/ai | 0.x |
| Monitoring | laravel/nightwatch | 1.x |
| OAuth / Social login | laravel/socialite | 5.x |
| Facebook SDK | facebook/php-business-sdk | 23.x |
| Frontend bridge | Inertia.js | 3.x |
| UI framework | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| Data tables | TanStack Table | 8.x |
| Server state | TanStack React Query | 5.x |
| Route helpers | Laravel Wayfinder | 0.x |
| Charts | Recharts | 2.x |
| Workflow editor | XYFlow (React Flow) | 12.x |
| VoIP PBX | Asterisk AMI | — |
| Softphone | Linphone | — |

---

## User Roles (Spatie)

| Role slug | Common name | Max lead workload | Auto-assigned leads? |
|-----------|------------|-------------------|----------------------|
| `super-admin` | Super Admin | unlimited | No |
| `support-agent` | CRO | 50 | Yes |
| `senior-support-agent` | Senior CRO | 50 | Yes |
| `sales-rep` | Advisor | 30 | Yes |
| `senior-sales-rep` | Senior Advisor | 30 | Yes |
| `manager` / `team-lead` | Management | — | No (excluded) |

Super-admin bypasses team scoping and all gate checks. Admin/manager/team-lead roles are excluded from auto-assignment queries.

---

## Lead Lifecycle

```
new
  └─ [auto-assigned] → assigned_to_cro
        └─ [CRO contacts] → contacted
              └─ [CRO qualifies] → qualified
                    └─ [auto-assigned] → assigned_to_advisor
                          │
                          │  advisor_stage sub-pipeline:
                          │  new → contacted → meeting → contract_signed → initial_payment → won
                          │                                                                ↘ lost (any stage)
                          │
                          ├─ lost        (requires loss_reason)
                          ├─ unqualified (requires loss_reason)
                          └─ requalify   (sends back → reassigned to qualified_by CRO)

nurturing  (long-term hold, any point)
closed     (terminal)
```

**Status constants** (`Lead::getStatusOptions()`):
`new`, `assigned_to_cro`, `contacted`, `qualified`, `assigned_to_advisor`, `converted`, `won`, `lost`, `unqualified`, `requalify`, `nurturing`, `closed`

**Terminal statuses**: `won`, `lost` — excluded from `scopeActive()`

**Spam leads**: not indexed in Meilisearch (see `Lead::shouldBeSearchable()`)

> **Design decision — why `assigned_to_cro`/`assigned_to_advisor` are explicit statuses:**
> `inquiry_status` tracks *where in the pipeline* the lead is. `assigned_to` tracks *who currently holds it*. These are orthogonal. Deriving assignment-phase from `assigned_to + user role` would require a JOIN on every query, break Meilisearch filtering, and cause silent status drift if a user's role changes. Never collapse these two concepts.

#### Advisor Sub-Pipeline (`advisor_stage`)

Active only when `inquiry_status = assigned_to_advisor`. Enforced state machine:

```
new → contacted → meeting → contract_signed → initial_payment → won
                                                               ↘ lost (from any stage)
```

| Stage | Side Effects |
|-------|-------------|
| `new` | auto-set on advisor assignment |
| `contacted` | activity logged |
| `meeting` | visible to Processing dept (`config/processing.php`) |
| `contract_signed` | creates `LeadCase` record |
| `initial_payment` | updates `LeadCase.initial_payment_at` + `initial_payment_amount` |
| `won` | sets `inquiry_status = won`, `converted_at = now()` |
| `lost` | sets `inquiry_status = lost`, stores `loss_reason` |

Processing dept visibility (`config/processing.php`): `meeting`, `contract_signed`, `initial_payment`, `won`

`advisor_stage` is nulled out on requalify and when lead is unassigned.

### Key Status Transition Methods on `Lead`

| Method | Sets Status | Side Effects |
|--------|-------------|-------------|
| `qualifyLead(User $by)` | `qualified` | sets `qualified_by`, `qualified_at`, fires `LeadQualified` |
| `convertLead()` | `converted` | sets `converted_at`, calls `LeadAssignmentService::updateMetricsOnConversion` |
| `requalifyLead(string $reason)` | `requalify` | sets `requalify_reason`, reassigns to `qualified_by`, nulls `advisor_stage`, calls `updateMetricsOnLoss` |
| `markAsLostWithReason(string $reason)` | `lost` | sets `loss_reason`, calls `updateMetricsOnLoss` |
| `markAsUnqualified(string $reason)` | `unqualified` | sets `loss_reason`, calls `updateMetricsOnLoss` |

---

## Lead Scoring

Initial score in `Lead::calculateInitialScore()` (called on `creating`):

| Condition | Points |
|-----------|--------|
| Base | 50 |
| Business email (not gmail.com) | +10 |
| Phone present | +10 |
| Occupation is CEO/CTO/Manager/Director | +10 |
| `lead_sources.source_score` | variable |
| Budget amount > 0 | +10 |
| Hard cap | 100 |

Activity-based update via `Lead::updateScore()`:
- Each activity in last 7 days: +5, capped at +20

**Hot lead** (`is_hot_lead` accessor): `lead_score >= 80` OR (`priority === 'high'` AND status in `['new', 'contacted']`)

---

## Intelligent Assignment Algorithm

### CRO Assignment (`LeadAssignmentService::assignToCRO`)

Eligibility: `availability = true`, `active = true`, role in `[support-agent, senior-support-agent]`, `current_lead_count < 50`

CRO Score (higher = better candidate):
```
base = 100
- workload_penalty  = (current_lead_count / 50) × 40
+ performance_bonus = (performance_weight - 1.0) × 20
+ conversion_bonus  = min(20, conversion_rate)
- recency_penalty   = 30  if last assigned < 5 min ago
                    = 15  if last assigned < 15 min ago
                    =  5  if last assigned < 30 min ago
                    =  0  otherwise
```

### Advisor Assignment (`LeadAssignmentService::assignToAdvisor`)

**Strict dual-match required**: advisor must match **both** service (hierarchy-aware) **AND** city/zone. Returns empty collection (no assignment) if either is missing.

Eligibility: `availability = true`, `active = true`, role in `[sales-rep, senior-sales-rep]`, NOT admin/manager/team-lead, `current_lead_count < 30`, active service assignment, zone matches lead's city

Service hierarchy matching (`buildServiceIdsForMatching`):
- Child service → match self + parent
- Parent service → match self + all children
- Standalone → match self only

Advisor Score (lower = better candidate):
```
+20     if no exact service match (hierarchy match only)
+0.35 × current_lead_count
+0.30 × service-specific lead count
- (hours_since_last_assignment × 0.001)  capped at 168h
- (performance_weight - 1.0) × 0.05
```

### Metrics Updated Per Event

| Event | Fields Changed |
|-------|---------------|
| Assignment | `current_lead_count++`, `total_leads_assigned++`, `last_assignment_at = now()` |
| Conversion | `converted_leads_count++`, `current_lead_count--` |
| Loss / Unqualified | `current_lead_count--` |
| Qualification | `qualified_leads_count++` |
| Reassignment | old: `current_lead_count--`; new: `current_lead_count++`, `total_leads_assigned++` |

### Performance Weight Tiers

| Conversion Rate | Weight |
|-----------------|--------|
| >= 30% | 1.5 |
| >= 20% | 1.3 |
| >= 10% | 1.1 |
| < 5% (with > 10 assignments) | 0.8 |
| Qualified leads > 50 | +0.1 bonus |
| Max cap | 2.0 |

### Post-Assignment Side Effects (always automated)

Every assignment creates two `LeadActivity` records:
1. `assignment_change` type, status `completed` — logged immediately
2. `task` type, status `pending`, due 24h from now — "Review and contact new lead"

Assignment also fires: `LeadAssigned`, `AssignmentQueueUpdated`

---

## Multi-Team Architecture

### BelongsToTeam Trait

Applied to: `Lead` (and any new model that must be team-scoped).

```php
// Auto-sets team_id on creating from auth user's current_team_id
// Global scope restricts queries to user's current_team_id (or NULL team_id)
// Super-admin bypasses scope entirely
Lead::withoutTeamScope() // for admin-level cross-team queries
```

### HasTeams Trait (on User)

- `currentTeam()` → BelongsTo `Team`
- `ownedTeams()` → HasMany (user owns these teams)
- `teams()` → BelongsToMany via `team_user` pivot (`role` column)
- `allTeams()` → all teams for super-admin, owned+member for others
- `switchTeam(Team)` → updates `current_team_id`
- `createPersonalTeam()` → called on registration, `personal_team = true`

### Team Model

- `personal_team` boolean — auto-created at registration
- Owner identified by `user_id` field, always treated as `admin` role
- `userRole(User)` returns `'admin'` for owner, otherwise pivot `role`
- `members()` → BelongsToMany users via `team_user`
- `invitations()` → HasMany `TeamInvitation`

### Test Helper

```php
joinTeam($team, $user); // defined in tests/Pest.php
// attaches user as member + sets current_team_id
// REQUIRED before any test that reads team-scoped data
```

---

## Privacy Rules

- **Phone numbers hidden from CRO roles** — never expose raw phone to `support-agent` / `senior-support-agent` in any API response or Inertia prop
- Calls routed through Asterisk PBX — CROs never dial customers directly
- Facebook tokens stored encrypted via `encrypt()` / `decrypt()` — never store or return plain tokens

---

## Call System (VoIP)

Architecture: Asterisk PBX → AMI webhook → CRM → Linphone softphone

### Public Routes (no auth guard)
```
POST /asterisk/inbound-call        → AsteriskCallController::handleInboundCall
POST /asterisk/outbound-call       → AsteriskCallController::handleOutboundCall
POST /asterisk/call-recording      → CallSessionController::updateRecording
POST /asterisk/ring-group-member   → AsteriskCallController::handleRingGroupMember
```

### Key Models
`CallSession`, `CallLog`, `SipAccount`, `CallParticipant`

Call directions: `inbound` / `outbound`
Call statuses: `ringing`, `answered`, `ended`, `missed`

### Real-time WebSocket Events (Reverb)
`CallInitiated`, `CallAnswered`, `CallEnded`, `CallStateChanged`, `InboundCallReceived`, `CallRecordingProcessed`

### Key Services
`AsteriskService` (AMI protocol), `CallSessionService` (lifecycle), `CallRecordingService` (storage)

---

## Routing

No separate `routes/api.php`. All routes live in:

| File | Purpose |
|------|---------|
| `routes/web.php` | All web + all API routes (API under `/api/` prefix inline) |
| `routes/auth.php` | Login, register, password reset, email verification |
| `routes/settings.php` | Profile, password, roles, lead sources/statuses, storage |
| `routes/teams.php` | Teams CRUD, members, invitations |
| `routes/channels.php` | Reverb broadcast channel definitions |
| `routes/console.php` | Scheduled commands |

### Permission Middleware Patterns
```php
->middleware('role:super-admin')                           // exact role check
->middleware('role_or_permission:super-admin|view leads') // role OR named permission
```

### Route Access Summary

| Area | Middleware |
|------|-----------|
| Dashboard | `role_or_permission:super-admin\|view dashboard` |
| Leads CRUD | `role_or_permission:super-admin\|view leads` |
| Users CRUD | `role:super-admin` (create/update/delete); `role_or_permission:super-admin\|manage team agents` (list/view) |
| Zones/Offices/Countries/Services management | `role:super-admin` |
| Assignment Visualizer | `role:super-admin` |
| PDF Templates | `role:super-admin` |
| Tasks, Support, Follow-up Calendar | any `auth + verified` |

---

## Database Conventions

### Key Column Types
- `leads.id` — UUID (`HasUuids` trait) — NOT integer
- `users.id` — bigint — NOT UUID
- `lead_activities.id` — UUID (`HasUuids` trait)

### PostgreSQL JSONB Columns
| Model | Column | Format |
|-------|--------|--------|
| Lead | `budget` | `{amount: number, currency: string}` |
| Lead | `custom_fields` | `{key: value, ...}` |
| Lead | `tags` | `[{value: string, label: string}, ...]` |
| LeadActivity | `metadata` | arbitrary JSON |
| LeadActivity | `attachments` | `[{filepath, filename, uploaded_at}, ...]` |

### Tag Querying Pattern
```php
// Correct
Lead::whereJsonContains('tags', ['value' => $tagValue])
// Wrong
Lead::where('tags', 'like', "%$tagValue%")
```

### Soft Deletes
`Lead`, `LeadActivity` — always use `withTrashed()` when needed; deleted leads are removed from Meilisearch index.

### Meilisearch Index
Index name: `leads_index`; leads not indexed when: `trashed()` OR `inquiry_status === 'spam'`

---

## Inertia Shared Props

Shared via `HandleInertiaRequests`. Access in React via `usePage().props`.

| Key | Type | Content |
|-----|------|---------|
| `auth.user` | User | Full user with roles + permissions loaded |
| `auth.permissions` | string[] | Flat array of all permission names |
| `auth.isSuperAdmin` | boolean | |
| `currentTeam` | Team\|null | User's active team |
| `allTeams` | Team[] | All teams user belongs to |
| `countries` | Country[] | All countries with province count |
| `statuses` | Status[] | Lead statuses ordered |
| `services` | Service[] | All services ordered |
| `sources` | LeadSource[] | Active lead sources |
| `sidebarCounts` | object | leads, notifications, tasks, calls, support counts |
| `impersonation` | object | `{isImpersonating, impersonator}` |

Do not re-fetch data available in shared props via API calls.

---

## Frontend Architecture

### Directory Map
| Path | Purpose |
|------|---------|
| `resources/js/pages/` | Inertia page components (route-level) |
| `resources/js/components/ui/` | shadcn/ui base components (83 total) |
| `resources/js/components/` | Feature-level components |
| `resources/js/hooks/` | Custom React hooks |
| `resources/js/lib/api.ts` | `api.get/post/put/delete` HTTP client |
| `resources/js/actions/` | Wayfinder-generated TS route functions (controllers) |
| `resources/js/routes/` | Wayfinder-generated TS route functions (named routes) |
| `resources/js/types/` | TypeScript type definitions |

### Design System
- **Metronic design language** — consistent horizontal/vertical spacing, professional modern UI
- **data-grid-table** — use for ALL data tables; must include column resizing, pinning, sorting
- **shadcn/ui + Radix UI** — headless component primitives

### Critical UI Patterns
```tsx
// Filter popovers: Popover + Command (see lead-status-combobox.tsx for reference)
// Badge: variant/appearance/size/shape props — check existing uses before adding new ones
// Dialog imports: Dialog, DialogBody, DialogClose, DialogContent, DialogDescription,
//   DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger
// CommandList: import from 'cmdk', NOT from @/components/ui/command
// Button link: use ghost variant + text color — no 'link' variant exists on Button
```

### HTTP Client
Use `api.get/post/put/delete` from `resources/js/lib/api.ts`.
CSRF: read `XSRF-TOKEN` cookie, send as `X-XSRF-TOKEN` header. No meta tag in Blade.

### Wayfinder
Always import routes from `@/actions/` or `@/routes/`. Never hardcode URL strings in TypeScript. After adding/changing routes: `php artisan wayfinder:generate`.

---

## Services Layer

| Service | Responsibility |
|---------|---------------|
| `LeadAssignmentService` | CRO + Advisor assignment, metrics updates, activity creation — **primary** |
| `CROAssignmentService` | Simpler CRO-only assignment (legacy; prefer `LeadAssignmentService`) |
| `AsteriskService` | AMI protocol communication with Asterisk PBX |
| `CallSessionService` | Call session lifecycle management |
| `CallRecordingService` | Recording storage and retrieval |
| `FacebookSdkService` | Raw Facebook API client |
| `FacebookService` | Facebook integration business logic |
| `FacebookAdsSyncService` | Campaign → AdSet → Ad → Form sync |
| `WorkflowService` | Workflow CRUD |
| `WorkflowExecutionService` | Workflow step execution engine |
| `DashboardMetricsService` | Dashboard overview aggregations |
| `BusinessPerformanceMetricsService` | Business-level KPI calculations |
| `UserPerformanceMetricsService` | Per-user performance snapshots |
| `LeadConversionMetricsService` | Conversion funnel metrics |
| `LeadCacheService` | Lead list caching helpers |
| `OtpService` | OTP generation + verification |
| `ReportService` | Report generation and export |

---

## Event Catalog

### Lead Events
`LeadAssigned` · `LeadQualified` · `LeadRequalified` · `LeadStageChanged` · `LeadUpdated` · `LeadDeleted`

### Call Events
`CallInitiated` · `CallAnswered` · `CallEnded` · `CallStateChanged` · `CallStatusChanged` · `CallRecordingProcessed` · `InboundCallReceived` · `OutboundCallReceived`

### Task Events
`TaskCreated` · `TaskUpdated` · `TaskDeleted` · `TaskDueReminder` · `TaskOverdue`

### Facebook Integration Events
`FacebookConnected` · `FacebookDisconnected` · `FacebookLeadProcessed` · `FacebookDataSynced` · `FacebookHealthStatusChanged` · `FacebookWebhookReceived` · `FacebookAutoSetupProgress` · `FacebookErrorOccurred` · `FacebookIntegrationEvent`

### System Events
`AssignmentQueueUpdated` · `RolePermissionsUpdated` · `MessageReceived` · `WorkflowStepExecuted`

---

## Lead Activities

Activity types: `call`, `email`, `meeting`, `note`, `task`, `follow_up`, `status_change`, `assignment_change`, `attribute_change`

Activity statuses: `pending`, `completed`, `cancelled`, `overdue`

Boot hook behavior:
- On `saving`: auto-marks as `overdue` when `due_at` is past and status is `pending`
- On `created`: increments `leads.pending_activities_count`
- On `updated` (status change): adjusts `leads.pending_activities_count` accordingly

Lead's `last_activity_at` is touched whenever `inquiry_status`, `priority`, or `assigned_to` changes.

---

## Testing Rules

All feature tests use `RefreshDatabase` (declared in `tests/Pest.php`).

### Required Patterns
```php
// Verified user
$user = User::factory()->create(['email_verified_at' => now()]);

// Team scope (required for any team-scoped data)
joinTeam($team, $user);

// Auth
actingAs($user)

// Run tests
php artisan test --compact --filter=SpecificTest
php artisan test --compact tests/Feature/SpecificTest.php
```

### What Must Be Tested
- Every new route/controller endpoint
- Business logic: assignment algorithm, lead scoring, status transitions
- Privacy: phone masking for CRO roles
- Team scoping: data isolation between teams
- Permission gates: role-restricted routes return 403 for unauthorized users

### What NOT to Do
- Never mock the database — use RefreshDatabase (real DB)
- Never delete existing tests without approval
- Never create verification scripts when feature tests already cover the behavior

---

## Migrations

When modifying existing columns, include ALL previously-defined attributes (Laravel 12 requirement — missing attributes are silently dropped):
```php
// Wrong — drops nullable, default, etc.
$table->string('column')->change();

// Correct — preserve all existing attributes
$table->string('column')->nullable()->default('value')->change();
```

---

## Common Pitfalls

1. **Team scope bypass** — use `Lead::withoutTeamScope()` for admin-level cross-team queries
2. **Super-admin scope** — `BelongsToTeam` already bypasses for super-admin; no redundant checks needed
3. **Lead UUID** — `leads.id` is UUID string; `find()` and joins must use strings, not integers
4. **Users bigint** — `users.id` is bigint; do not treat as UUID
5. **No api.php** — never create `routes/api.php`; all routes go in `web.php`
6. **No VerifyCsrfToken class** — Laravel 12; CSRF configured in `bootstrap/app.php` only
7. **Wayfinder regeneration** — run `php artisan wayfinder:generate` after any route change
8. **Tags JSON format** — `[{value, label}]` array of objects; use `whereJsonContains` not LIKE
9. **Meilisearch filters** — new filterable/sortable fields must be added to `Lead::searchableSettings()` before they work
10. **Phone masking** — never return raw `phone` field to `support-agent` / `senior-support-agent` roles
11. **Facebook tokens** — always `encrypt()` before storing, `decrypt()` before using; never store or log plain tokens
12. **Assignment creates activities** — `performAssignment()` creates 2 activities automatically; never create them manually in the same flow
13. **Advisor assignment strict match** — if lead has no city OR no service, advisor auto-assignment silently returns null; this is expected behavior

---

## Artisan Commands Reference

```bash
php artisan test --compact                          # run all tests (always use --compact)
php artisan test --compact --filter=ClassName       # run specific test
vendor/bin/pint --dirty                             # format changed PHP files (run before commit)
php artisan wayfinder:generate                      # regenerate TS route functions
php artisan scout:sync-index-settings               # push Meilisearch index settings
php artisan tasks:check-reminders                   # scheduled every 15 min
```

---

## Agent Invocation Guide

| Task | Agent to use |
|------|-------------|
| New feature requiring architecture decisions | `senior-system-architect` |
| Lead lifecycle / assignment / scoring changes | `senior-software-engineer` → `senior-tdd-engineer` |
| VoIP / Asterisk / SIP / Linphone work | `asterisk-voip-expert` |
| Writing or modifying tests | `senior-tdd-engineer` + `pest-testing` skill |
| Frontend pages / Inertia components | `inertia-react-development` skill |
| Styling / Tailwind changes | `tailwindcss-development` skill |
| Route references in TypeScript | `wayfinder-development` skill |
| Post-implementation code review | `senior-code-reviewer` |
| PHP simplification / refactoring | `laravel-simplifier` |
| Architecture plan review | `plan-reviewer` |
| New UI pages or UX improvements | `senior-ui-designer` |

---

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - ^8.2
- inertiajs/inertia-laravel (INERTIA) - v3
- laravel/framework (LARAVEL) - v13
- laravel/horizon (HORIZON) - v5
- laravel/reverb (REVERB) - v1
- laravel/scout (SCOUT) - v10
- laravel/wayfinder (WAYFINDER) - v0
- laravel/ai (AI) - v0
- laravel/nightwatch (NIGHTWATCH) - v1
- laravel/socialite (SOCIALITE) - v5
- laravel/pint (PINT) - v1
- laravel/sail (SAIL) - v1
- pestphp/pest (PEST) - v4
- facebook/php-business-sdk - v23
- spatie/laravel-permission - v6
- spatie/laravel-medialibrary - v11
- spatie/laravel-activitylog - v4
- @inertiajs/react (INERTIA) - v3
- react (REACT) - v19
- tailwindcss (TAILWINDCSS) - v4
- @laravel/vite-plugin-wayfinder (WAYFINDER) - v0
- eslint (ESLINT) - v9
- laravel-echo (ECHO) - v2
- prettier (PRETTIER) - v3

## Skills Activation

This project has domain-specific skills available. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

- `wayfinder-development` — Activates whenever referencing backend routes in frontend components. Use when importing from @/actions or @/routes, calling Laravel routes from TypeScript, or working with Wayfinder route functions.
- `pest-testing` — Tests applications using the Pest 4 PHP framework. Activates when writing tests, creating unit or feature tests, adding assertions, testing Livewire components, browser testing, debugging test failures, working with datasets or mocking; or when the user mentions test, spec, TDD, expects, assertion, coverage, or needs to verify functionality works.
- `inertia-react-development` — Develops Inertia.js v3 React client-side applications. Activates when creating React pages, forms, or navigation; using &lt;Link&gt;, &lt;Form&gt;, useForm, or router; working with deferred props, prefetching, or polling; or when user mentions React with Inertia, React pages, React forms, or React navigation.
- `tailwindcss-development` — Styles applications using Tailwind CSS v4 utilities. Activates when adding styles, restyling components, working with gradients, spacing, layout, flex, grid, responsive design, dark mode, colors, typography, or borders; or when the user mentions CSS, styling, classes, Tailwind, restyle, hero section, cards, buttons, or any visual/UI changes.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

- Laravel Boost is an MCP server that comes with powerful tools designed specifically for this application. Use them.

## Artisan

- Use the `list-artisan-commands` tool when you need to call an Artisan command to double-check the available parameters.

## URLs

- Whenever you share a project URL with the user, you should use the `get-absolute-url` tool to ensure you're using the correct scheme, domain/IP, and port.

## Tinker / Debugging

- You should use the `tinker` tool when you need to execute PHP to debug code or query Eloquent models directly.
- Use the `database-query` tool when you only need to read from the database.

## Reading Browser Logs With the `browser-logs` Tool

- You can read browser logs, errors, and exceptions using the `browser-logs` tool from Boost.
- Only recent browser logs will be useful - ignore old logs.

## Searching Documentation (Critically Important)

- Boost comes with a powerful `search-docs` tool you should use before trying other approaches when working with Laravel or Laravel ecosystem packages. This tool automatically passes a list of installed packages and their versions to the remote Boost API, so it returns only version-specific documentation for the user's circumstance. You should pass an array of packages to filter on if you know you need docs for particular packages.
- Search the documentation before making code changes to ensure we are taking the correct approach.
- Use multiple, broad, simple, topic-based queries at once. For example: `['rate limiting', 'routing rate limiting', 'routing']`. The most relevant results will be returned first.
- Do not add package names to queries; package information is already shared. For example, use `test resource table`, not `filament 4 test resource table`.

### Available Search Syntax

1. Simple Word Searches with auto-stemming - query=authentication - finds 'authenticate' and 'auth'.
2. Multiple Words (AND Logic) - query=rate limit - finds knowledge containing both "rate" AND "limit".
3. Quoted Phrases (Exact Position) - query="infinite scroll" - words must be adjacent and in that order.
4. Mixed Queries - query=middleware "rate limit" - "middleware" AND exact phrase "rate limit".
5. Multiple Queries - queries=["authentication", "middleware"] - ANY of these terms.

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.

## Constructors

- Use PHP 8 constructor property promotion in `__construct()`.
    - <code-snippet>public function __construct(public GitHub $github) { }</code-snippet>
- Do not allow empty `__construct()` methods with zero parameters unless the constructor is private.

## Type Declarations

- Always use explicit return type declarations for methods and functions.
- Use appropriate PHP type hints for method parameters.

<code-snippet name="Explicit Return Types and Method Params" lang="php">
protected function isAccessible(User $user, ?string $path = null): bool
{
    ...
}
</code-snippet>

## Enums

- Typically, keys in an Enum should be TitleCase. For example: `FavoritePerson`, `BestLake`, `Monthly`.

## Comments

- Prefer PHPDoc blocks over inline comments. Never use comments within the code itself unless the logic is exceptionally complex.

## PHPDoc Blocks

- Add useful array shape type definitions when appropriate.

=== herd rules ===

# Laravel Herd

- The application is served by Laravel Herd and will be available at: `https?://[kebab-case-project-dir].test`. Use the `get-absolute-url` tool to generate valid URLs for the user.
- You must not run any commands to make the site available via HTTP(S). It is always available through Laravel Herd.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/Pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

=== inertia-laravel/v3 rules ===

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- v2 features: deferred props, infinite scrolling (merging props + `WhenVisible`), lazy loading on scroll, polling, prefetching.
- v3 features: async components, improved SSR, enhanced TypeScript support. Always use `search-docs` for v3-specific API.
- When using deferred props, add an empty state with a pulsing or animated skeleton.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using the `list-artisan-commands` tool.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

## Database

- Always use proper Eloquent relationship methods with return type hints. Prefer relationship methods over raw queries or manual joins.
- Use Eloquent models and relationships before suggesting raw database queries.
- Avoid `DB::`; prefer `Model::query()`. Generate code that leverages Laravel's ORM capabilities rather than bypassing them.
- Generate code that prevents N+1 query problems by using eager loading.
- Use Laravel's query builder for very complex database operations.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `list-artisan-commands` to check the available options to `php artisan make:model`.

### APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## Controllers & Validation

- Always create Form Request classes for validation rather than inline validation in controllers. Include both validation rules and custom error messages.
- Check sibling Form Requests to see if the application uses array or string based validation rules.

## Authentication & Authorization

- Use Laravel's built-in authentication and authorization features (gates, policies, Sanctum, etc.).

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Queues

- Use queued jobs for time-consuming operations with the `ShouldQueue` interface.

## Configuration

- Use environment variables only in configuration files - never use the `env()` function directly outside of config files. Always use `config('app.name')`, not `env('APP_NAME')`.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== laravel/v13 rules ===

# Laravel 13

- CRITICAL: ALWAYS use `search-docs` tool for version-specific Laravel documentation and updated code examples.
- Since Laravel 11, Laravel has a new streamlined file structure which this project uses.

## Laravel 13 Structure

- Middleware are not registered in `app/Http/Kernel.php` — configured declaratively in `bootstrap/app.php` using `Application::configure()->withMiddleware()`.
- `bootstrap/app.php` is the file to register middleware, exceptions, and routing files.
- `bootstrap/providers.php` contains application specific service providers.
- `app\Console\Kernel.php` does not exist; use `bootstrap/app.php` or `routes/console.php` for console configuration.
- Console commands in `app/Console/Commands/` are automatically available and do not require manual registration.

## Database

- When modifying a column, the migration must include all of the attributes that were previously defined on the column. Otherwise, they will be dropped and lost.
- Eager loading record limits available natively: `$query->latest()->limit(10);`

### Models

- Casts can and likely should be set in a `casts()` method on a model rather than the `$casts` property. Follow existing conventions from other models.

=== wayfinder/core rules ===

# Laravel Wayfinder

Wayfinder generates TypeScript functions for Laravel routes. Import from `@/actions/` (controllers) or `@/routes/` (named routes).

- IMPORTANT: Activate `wayfinder-development` skill whenever referencing backend routes in frontend components.
- Invokable Controllers: `import StorePost from '@/actions/.../StorePostController'; StorePost()`.
- Parameter Binding: Detects route keys (`{post:slug}`) — `show({ slug: "my-post" })`.
- Query Merging: `show(1, { mergeQuery: { page: 2, sort: null } })` merges with current URL, `null` removes params.
- Inertia: Use `.form()` with `<Form>` component or `form.submit(store())` with useForm.

=== pint/core rules ===

# Laravel Pint Code Formatter

- You must run `vendor/bin/pint --dirty` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test`, simply run `vendor/bin/pint` to fix any formatting issues.

=== pest/core rules ===

## Pest

- This project uses Pest for testing. Create tests: `php artisan make:test --pest {name}`.
- Run tests: `php artisan test --compact` or filter: `php artisan test --compact --filter=testName`.
- Do NOT delete tests without approval.
- CRITICAL: ALWAYS use `search-docs` tool for version-specific Pest documentation and updated code examples.
- IMPORTANT: Activate `pest-testing` every time you're working with a Pest or testing-related task.

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

=== tailwindcss/core rules ===

# Tailwind CSS

- Always use existing Tailwind conventions; check project patterns before adding new ones.
- IMPORTANT: Always use `search-docs` tool for version-specific Tailwind CSS documentation and updated code examples. Never rely on training data.
- IMPORTANT: Activate `tailwindcss-development` every time you're working with a Tailwind CSS or styling-related task.
</laravel-boost-guidelines>
- always warn about the context remaining and before starting a new task make
  sure the left over context is enough for the or not. if not ask the user to
  use compact
- NEVER add `Co-Authored-By` lines to git commit messages. Do not include any Codex attribution in commits.

=== documentation context ===

## Project Documentation
- **Product**: Read `docs/product.md` for product overview, value propositions, features, and product requirements.
- **Architecture**: Read `docs/architecture.md` for tech stack, system design, data models, and integration details.
- When making product or architecture decisions, consider these docs as the source of truth.

=== current design rules ===

## Design Language
- Use metronic design language with consistent horizontal and vertical spacing, professional and modern UI/UX
- Use data-grid-table for datatables with all the options column resizing, pining etc.

=== skills context ===

## Agent-Based Skills (Auto-Invoke)

Invoke these specialized agents proactively based on task nature using the Task tool:

### Code Quality & Review
- **senior-code-reviewer** — Invoke after implementing new features, fixing bugs, or refactoring code. Reviews code quality, test coverage, and adherence to best practices.
- **laravel-simplifier** — Invoke when PHP/Laravel code needs simplification, refactoring for clarity, or consistency improvements. Focuses on recently modified code.

### Testing & TDD
- **senior-tdd-engineer** — Invoke when implementing features using TDD methodology, writing tests before implementation, refactoring with test coverage, or reviewing test quality. Use proactively for any code changes.

### Architecture & Design
- **senior-system-architect** — Invoke when designing new feature sets, evaluating system architecture, planning complex integrations, or making high-level technical decisions spanning multiple components.
- **senior-software-engineer** — Invoke for high-level system design, architecture decisions, code review for architectural patterns, or integration planning across domains.
- **plan-reviewer** — Invoke to review architectural plans, database schemas, API designs, or technical proposals before implementation begins.

### UI/UX Design
- **senior-ui-designer** — Invoke after creating new UI components/pages or when improving existing UI/UX, fixing visual bugs, enhancing user experience, or getting guidance on layout, spacing, typography.

### VoIP & Telephony
- **asterisk-voip-expert** — Invoke for VoIP/SIP/PJSIP configuration, Asterisk PBX, FreePBX, softphone integration (Linphone), CRM telephony integrations, dialplan, SIP trunks, WebRTC, call routing, IVR, or queue management.

## Project Skills (Manual Activation)

Activate these domain-specific skills using the Skill tool when working in these domains:

- **wayfinder-development** — When importing from @/actions or @/routes, calling Laravel routes from TypeScript, or working with Wayfinder route functions.
- **pest-testing** — When writing tests, creating unit/feature tests, adding assertions, debugging test failures, working with datasets/mocking.
- **inertia-react-development** — When creating React pages/forms/navigation, using Link/Form/useForm/router, working with deferred props, prefetching, or polling.
- **tailwindcss-development** — When adding styles, working with layout, responsive design, dark mode, colors, typography, or any visual/UI changes.

## Skill Invocation Rules

1. **Proactive Invocation**: Invoke relevant agents WITHOUT waiting for user request when task matches agent description.
2. **Parallel Execution**: Launch multiple agents concurrently when tasks are independent.
3. **Sequential Workflow**: For complex tasks, chain agents (e.g., architect → TDD engineer → code reviewer).
4. **Post-Implementation Review**: ALWAYS invoke senior-code-reviewer after significant code changes.
