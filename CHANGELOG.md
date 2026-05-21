# Changelog

All notable changes to SALF CRM v2 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- `SuggestedMappingDictionary` — per-template field_name → canonical_path lookup for `form_d1` (A1–B56), `form_d2`, `form_d4`; controller passes `suggested_path` alongside each field; mapping page pre-fills inputs from suggestions (amber border + amber row background) and shows "N suggested" counter; editing any suggested path clears the suggestion marker; paths persist to DB on Save Mappings
- `CanonicalPathDictionary` — static class seeding 130+ known canonical paths for Dominica CBI (`DOM_CBI`): main applicant personal/passport/contact/address/employment, spouse (mirrored), dependents 1–4, investment, application meta; merged with DB paths in `TemplatesMappingsController` so autocomplete shows full vocabulary on first use
- Forms automation UI: Full-screen image viewer dialog in field mapping — click preview thumbnail or "Expand" button to open dialog; toolbar shows page number, active field badge, prev/next buttons, page pills, close; keyboard ← → arrows navigate pages; legend footer; SVG field overlays preserved at full scale
- Forms automation UI: PDF page thumbnail preview in field mapping — two-column layout with clickable field rows; right panel shows the actual PDF page rendered as PNG with SVG overlay highlighting all fields (yellow) and the selected field (blue); page selector tabs; field info card below preview; `TemplatePageController` + `GET /api/forms/templates/{formTemplate}/pages/{page}` streams PNG from forms-service; `useTemplatePage` React Query hook caches rendered pages 1hr
- Forms automation UI: Structured applicant data entry form — after admin maps PDF fields to canonical paths, processing users see labeled section cards (Main Applicant, Spouse, etc.) instead of raw JSON; falls back to raw JSON editor if no mappings exist or via "Edit raw JSON" toggle
- `ProgramSchemaController` + `GET /api/forms/programs/{program}/schema` — derives structured data-entry schema from program's active field mappings, groups fields by dot-notation prefix (e.g. `main_applicant.*`), returns human-readable labels
- `useProgramSchema` React Query hook — fetches schema on program select, drives the structured form
- Forms automation UI: Programs & templates list at `/settings/management/pdf-templates` — expandable program cards with template rows, per-template Sync Inventory button (calls `inspectPdf`), "Map Fields" link
- Forms automation UI: Field mapping page at `/settings/management/forms/programs/{program}/templates/{template}/mappings` — table of all PDF fields, inline `canonical_path` input with autocomplete, truthy-value and transform columns, save-all button
- Forms automation UI: Applications list at `/settings/management/forms/applications` — paginated table of all applications with status badges and navigation
- Forms automation UI: Application create/edit form at `/settings/management/forms/applications/create` — program select, applicant name/passport fields, JSON data editor with default schema
- Forms automation UI: Application detail + generation status at `/settings/management/forms/applications/{application}` — applicant details, Generate Forms button, generation history table with real-time polling, Download ZIP button
- `useFormsAutomation.ts` React Query hooks — `useSyncInventory`, `useGetMappings`, `useSaveMappings`, `useCreateApplication`, `useUpdateApplication`, `useDeleteApplication`, `useGenerateApplicationForms`, `useApplicationGenerations` (with auto-refresh when generation is running)
- 4 Settings Inertia controllers: `ProgramsController`, `TemplatesMappingsController`, `ApplicationsController` in `App\Http\Controllers\Settings\Forms\`
- 3 JSON API controllers: `FormTemplateApiController` (sync inventory, get/save mappings), `ApplicationApiController` (CRUD + generate), `GenerationApiController` (list + download ZIP) in `App\Http\Controllers\Api\Forms\`
- 9 API routes under `api/forms/` prefix and 6 Inertia page routes under `settings/management/forms/`
- Forms automation: 6 migrations — `programs`, `form_templates`, `template_fields`, `field_mappings`, `applications`, `application_generations` (with GIN index on `applications.data`)
- Forms automation: 5 enums (`FileType`, `MappingMode`, `FieldType`, `ApplicationStatus`, `GenerationStatus`) in `App\Enums\Forms\`
- Forms automation: 6 Eloquent models (`Program`, `FormTemplate`, `TemplateField`, `FieldMapping`, `Application`, `ApplicationGeneration`) in `App\Models\Forms\` with factories, casts, and relationships
- Forms automation: model relationship tests and application code generation tests (20 passing)
- Forms automation: `FormsServiceClient` with `inspectPdf`, `renderPage`, `fillPdf`, `renderDocx`, `ocrRegion` — Bearer auth, User-Agent, retry(3/250ms) on 5xx/connection errors, exception mapping, per-call logging to `forms` channel; 7 tests passing
- Forms automation: `FormsServiceClient` singleton registered in `AppServiceProvider::register()` — wired to `services.forms_service` config and `forms` log channel
- Forms automation: `DominicaCbiSeeder` — idempotent seeder creating Dominica CBI program + 13 form templates (7 PDF, 6 DOCX) with correct `file_type`, `mapping_mode`, `sort_order`; registered in `DatabaseSeeder`; 2 feature tests (creation + idempotency)
- Forms automation: `GenerateApplicationFormsJob` — queued job on `forms` queue (tries=3, timeout=600s, backoff=30s) that loops all active templates, calls `fillPdf`/`renderDocx`, writes output to `forms_output` disk, builds ZIP bundle, updates `ApplicationGeneration` row to `completed`/`failed`; per-template errors logged and skipped, `FormsServiceAuthException` re-thrown as systemic; 3 feature tests passing
- Forms automation: DTOs (`InspectedField`, `InspectResponse`, `OcrRegionResponse`) in `App\Services\Forms\Data\` and exception hierarchy (`FormsServiceException` + 4 subtypes) in `App\Exceptions\Forms\`
- Forms automation: `config/forms.php`, `forms_service` block in `config/services.php`, `forms_output` disk in `config/filesystems.php`, `forms` log channel in `config/logging.php`, `supervisor-forms` in Horizon production config, `.env.example` vars, `storage/app/forms_output/.gitkeep`
- `CHANGELOG.md` — project changelog tracking all notable changes
- `AGENTS.md` — comprehensive business logic and codebase reference for AI agents
- `CLAUDE.md` rule: always update `CHANGELOG.md` on every commit

### Fixed
- Forms automation: field mapping SVG overlays never rendered — `rect_pdf` and `page_size_pdf` were not included in the Inertia props from `TemplatesMappingsController`; added both fields to the fields map
- Forms automation: PDF page preview "Could not load preview" — custom http client (`@/lib/http`) always calls `response.json()` on binary PNG responses, causing `URL.createObjectURL(null)` to throw; fixed `useTemplatePage` hook to use native `fetch` + `response.blob()` instead
- `FormsServiceClient::fillPdf()`: renamed field `applicant_data` → `applicant` to match forms-service API contract; cast empty mapping array to `stdClass` so JSON encodes as `{}` not `[]`
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
