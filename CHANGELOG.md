# Changelog

All notable changes to SALF CRM v2 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- Forms automation: 6 migrations — `programs`, `form_templates`, `template_fields`, `field_mappings`, `applications`, `application_generations` (with GIN index on `applications.data`)
- Forms automation: 5 enums (`FileType`, `MappingMode`, `FieldType`, `ApplicationStatus`, `GenerationStatus`) in `App\Enums\Forms\`
- Forms automation: 6 Eloquent models (`Program`, `FormTemplate`, `TemplateField`, `FieldMapping`, `Application`, `ApplicationGeneration`) in `App\Models\Forms\` with factories, casts, and relationships
- Forms automation: model relationship tests and application code generation tests (20 passing)
- Forms automation: `config/forms.php`, `forms_service` block in `config/services.php`, `forms_output` disk in `config/filesystems.php`, `forms` log channel in `config/logging.php`, `supervisor-forms` in Horizon production config, `.env.example` vars, `storage/app/forms_output/.gitkeep`
- `CHANGELOG.md` — project changelog tracking all notable changes
- `AGENTS.md` — comprehensive business logic and codebase reference for AI agents
- `CLAUDE.md` rule: always update `CHANGELOG.md` on every commit

### Fixed
- SSR: configure null Echo broadcaster in `ssr.tsx` so `useEcho` hooks don't throw "Echo has not been configured" during server-side rendering
- Replace `resolvePageComponent` with typed `import.meta.glob` in `app.tsx` (lazy, `ComponentType<PageProps>`) and `ssr.tsx` (eager, `{ default: ComponentType }`) to fix Inertia v3 `TS2769` type mismatch

### Changed
- Upgraded Laravel framework from v12 to v13
- Upgraded Inertia.js (server + client) from v2 to v3
- Updated `CLAUDE.md` package versions: added `laravel/ai v0`, `laravel/nightwatch v1`, `laravel/socialite v5`, `facebook/php-business-sdk v23`
- Updated `docs/product.md`: corrected lead scoring formula, added advisor sub-pipeline stages table, added design decision note on `assigned_to_cro`/`assigned_to_advisor` statuses
- Updated `docs/architecture.md`: Laravel 13, Inertia v3, new packages, `advisor_stage` and `lead_cases` in schema

---

## Teams Feature

### Added
- Multi-team support: users belong to teams, data is isolated per team
- `Team`, `TeamInvitation` models with invite flow (token-based registration)
- `BelongsToTeam` trait auto-scopes queries to `current_team_id`; super-admin bypasses scope
- `team_id` column on `leads`, `tasks`, `call_sessions`, `workflows`, `tickets`, `messages`, `meta_pages`
- `BelongsToTeam` trait applied to `CallSession`, `Workflow`, `Ticket`, `Message`
- `MetaPage.team_id` — Facebook pages are tied to a team for lead routing
- Facebook lead routing: `FacebookService::createNewLead()` sets `team_id` from `form → MetaPage → team_id` (webhook path is unauthenticated; trait boot hook cannot fire)
- `FacebookOAuthController`, `WorkflowController`, `AutoSetupFacebookJob` set `team_id` on `MetaPage` when syncing
- Team invitation notification (`TeamInvitationNotification`)
- `AcceptInvitation` React page for token-based team registration
- Team switcher in sidebar
- Team management pages (`Teams/Index`, `Teams/Show`)
- `joinTeam()` test helper in `tests/Pest.php`

### Changed
- `BelongsToTeam` global scope updated to `WHERE team_id = ? OR team_id IS NULL` (previously strict match only)
- `HandleInertiaRequests` shares `currentTeam` and `allTeams` props

---

## Tests

### Added
- `LeadScoringTest` — 17 tests covering `calculateInitialScore()`, `is_hot_lead` accessor, `updateScore()` activity bonus
- `LeadTeamScopingTest` — 6 tests covering `BelongsToTeam` on `Lead` model (auto-assign, isolation, super-admin bypass, team switching, NULL team_id visibility)
- `DomainTeamScopingTest` — 14 tests covering `BelongsToTeam` on `CallSession`, `Workflow`, `Ticket`, `Message`, plus Facebook lead team routing (2 tests)

### Changed
- `TeamTest` — extended with invitation, BelongsToTeam scope, and team switching tests
- Existing feature tests updated to use `joinTeam()` helper for team-scoped queries
