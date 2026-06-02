# Changelog

All notable changes to SALF CRM v2 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- System settings page (`/settings/system`) for super-admin — toggle calling feature on/off and configure phone reveal duration; `SystemSettingController` (GET/PUT) and `system_settings` table/model
- `systemSettings` shared via Inertia `shareOnce` (`calling_enabled`, `phone_reveal_duration`) with a `SystemSettings` TypeScript interface on `SharedData`; System nav item added to the settings sidebar (super-admin only)
- Phone reveal feature — `PhoneRevealController` (POST `/api/leads/{lead}/phone-reveal`) returns a time-limited phone number; `PhoneRevealButton` in the lead page header masks digits, reveals on click, and auto-hides after the configured duration. When calling is enabled the header shows a Call button (phone hidden); when disabled it shows the masked phone with a timed reveal
- `LogPhoneReveal` queued job writes a `PhoneReveal` audit record plus a `phone_reveal` `LeadActivity` (subject, ip_address, duration_seconds, expires_at); `phone_reveal` activity type added to the `lead_activities_type_check` constraint and rendered in the activity feed with a `PhoneCall` icon
- Phone reveal audit log table on the System Settings page (agent, lead, IP, revealed at, expired at; 20/page)
- Create-dialog note editor — inline image insert (Lexical image node + insert button) and a "link a meeting" popover; notes persist `editor_state` and `linked_meeting` metadata via `LeadActivityController`, surfaced in the new notes sheet
- `GoogleCalendarController::getEvents` (GET `/.../{id}/events`) — lists events from a connected Google Calendar within a time range, used by the meeting-link popover
- Lead extended details — budget editing gains an inline currency picker (USD/EUR/PKR) via a popover next to the amount
- Lead documents tab — editable shared applicant-info fields (main applicant given name, surname, passport, mobile phone, etc.) with nested get/set helpers so applicant data can be filled directly from the documents view
- `seq` monotonic numeric column on `leads` (migration backfills existing rows in `created_at` order; new rows default from a Postgres sequence) — a unique, range-filterable keyset/cursor key. The UUID primary key cannot be range-filtered in Meilisearch, so `seq` is indexed as both sortable and filterable to give Postgres and the search index one shared cursor key
- `App\Support\LeadKeyset` helper — encodes/decodes opaque cursors and builds the keyset seek predicate for both the database query and the Meilisearch filter, including the offset-cursor fallback for string sort fields
- `LeadKeysetTest` (unit) and `LeadCursorPaginationTest` (feature) covering cursor round-tripping, sort-change invalidation, overlap-free walking, and the tied-sort tiebreaker

### Added
- Partial composite `(sort_field, seq)` indexes on `leads` for every keyset date/score sort (`created_at`, `updated_at`, `last_activity_at`, `next_follow_up_at`, `assigned_date`, `lead_score`), each scoped `WHERE deleted_at IS NULL`. The cursor query now plans as a pure index-range scan instead of "Index Scan + Incremental Sort + Filter"

### Fixed
- `LeadSource::active_leads_count` was filtering on `inquiry_status = 'active'`, an invalid status value, so the active-leads count was always `0`. It now reuses the `Lead` `active` scope (every lead not `won`/`lost`), matching the rest of the codebase's definition of an active lead
- `Lead::setPhoneAttribute` no longer raises a `preg_replace(): Passing null to parameter #3 ($subject)` deprecation when a `null` phone is assigned — a `null` value is now stored as-is instead of being passed to `preg_replace`
- N+1 on the leads grid: each row's first task now eager-loads its assignee (`tasks.assignedTo`) on both the database and Meilisearch list paths, instead of lazily resolving one `users` query per lead in `LeadResource::next_task`
- N+1 on the leads grid and lead-sources list: `LeadSourceResource` no longer triggers the `getLeadsCountAttribute` / `getActiveLeadsCountAttribute` count accessors when rendered per row — the counts are read from raw attributes and emitted only when the caller eager-counted them, eliminating two `count(*)` queries per source (up to 40 per leads page, 200 per sources page)

### Changed
- `LeadKeyset` now emits a row-value (tuple) seek `(field, seq) < (?, ?)` for non-nullable sort fields, which Postgres resolves to a true index-range scan (`Index Cond`) instead of a `BitmapOr` + sort that scans and discards rows before the cursor boundary — ~5× faster on deep pages. Nullable sort fields keep the COALESCE OR-seek form
- Leads list `sort_by` validation now accepts `next_follow_up_at` and `assigned_date`, matching the sort fields the keyset helper already supports (previously rejected with "selected sort by is invalid")
- Leads main grid switched from offset `paginate()` to keyset/cursor (seek) pagination on both the database and Meilisearch search paths. No page numbers and no total-count query — the UI now uses prev/next over an opaque cursor (`meta.next_cursor` + `meta.has_more`). Ordering is the chosen sort field plus the unique `seq` tiebreaker; the database path is true keyset for every sort field, and the Meilisearch path is true keyset for numeric sort fields, falling back to an offset-cursor (same UX) for string sort fields since Meilisearch cannot range-filter strings. Both web (`Leads\LeadController`) and API (`Api\Leads\LeadController`) index endpoints updated; changing any filter or sort invalidates a stale cursor and restarts from the first page
- `DashboardController::getProgramSalesBreakdown` now computes the per-program created/qualified/won counts in a single grouped aggregate query (Postgres `COUNT(*) FILTER`) plus one parent-service lookup, replacing 12 separate count queries (3 programs × `whereHas` clone-counts); RBI's "D%" service exclusion is preserved
- `pdf-utils` and `export-utils` now lazy-load their heavy dependencies (`pdf-lib`, `jspdf`, `html2canvas`) via dynamic `import()` inside the async functions that use them, instead of static top-level imports. Pages that only use the synchronous mapping/CSV/JSON helpers no longer pull the ~900 KB PDF libraries into their bundle; the `SuperAdminDashboard` chunk dropped from ~267 KB to ~67 KB as its export button no longer eagerly bundles `jspdf`/`html2canvas`
- Vite build now splits heavy vendor libraries into dedicated cached chunks via `build.rollupOptions.output.manualChunks` — `react-vendor` (single React instance), `echarts`, `recharts`, `pdf` (pdf-lib/jspdf/pdfjs), and `lexical`. Charts/PDF/editor code is downloaded once and cached across navigation instead of being duplicated into every page chunk; `SuperAdminDashboard` chunk dropped from ~630 KB to ~267 KB and the duplicated ~382 KB recharts chunk is eliminated
- Super-admin dashboard overview now reads precomputed `DailyMetric` values (total/qualified/converted leads, avg lifecycle days) with a live-query fallback, matching the manager dashboard — avoids redundant full-table aggregates on cache miss
- `ProgramDrillDownDialog` — full-screen dialog (90vh) opening when clicking any program line/data point/column in LTS (Won) Performance Trends; shows ECharts Sankey pipeline flow for that program, stage breakdown table (click row → leads filtered by stage), recent leads table (click row → lead detail page), header with total/won/rate + "View all leads" link
- `CalendarHeatmap` (ECharts) — full-year lead volume heatmap with `roundRect scatter` cells + `effectScatter` ripple on top-10 days (pissang pattern); click any day drills down to `/leads?date_from=X&date_to=X`
- `SankeyPipeline` (ECharts) — lead pipeline flow chart showing stage-to-stage transitions with drop-off nodes in red; click stage node drills down to filtered leads page; period toggle 7D–3M
- Drill-down clicks added to: Conversion Rate Trend (click data point → leads by date), Lead Source Performance bar (click bar → leads by source), Program Performance bar (click bar → leads by program)
- `ScoreGaugeCard` — new SVG semicircle gauge card for Avg Lead Score: track + fill arc (180°→0°), color-coded green/amber/red by score range, center score text with `/100` label, 0 and max axis ticks
- `StatMetricCard` sparkline threshold lowered from `> 1` to `>= 1`, shows dots when ≤7 data points, dashed line when ≥3 points (Nightwatch aesthetic), gradient fill opacity reduced for subtlety
- `NightTooltip` component — new shared dashboard tooltip matching Nightwatch design: near-black `bg-zinc-950` card, monospace label header with divider, pill color indicators (`w-1 h-4 rounded-full`), right-aligned monospace values, optional total row; used across all dashboard charts
- Fixed value/label concatenation bug in all tooltip formatters (was rendering `8.5%Overall` without separator)
- `lead-lifecycle-funnel` — fixed label overflow/clipping bug (labels moved outside bars); bars now render as clean `h-7` progress bars with label+count+% above; removed excess whitespace; Nightwatch-style
- `lead-lifecycle-analysis` — replaced dated colored-border metric cards with minimal stat strip; bar chart applies Nightwatch gridlines/axis styling; bottlenecks and stage breakdown converted from card-list to clean tables with severity color chips
- Dashboard charts redesigned to Nightwatch aesthetic — horizontal-only gridlines (`strokeOpacity={0.07}`), dashed lines (`strokeDasharray="5 3"`), no axis borders, dots at data points; `ad-sources-chart` replaced PieChart donut with horizontal ranked bar list; `lead-source-performance` replaced dual-axis BarChart with color-coded horizontal bars (quality-coded colors) + clean data table; `program-performance` horizontal bars + program table with WoW trend arrows; `quarterly-performance-trends` gains summary metric strip (Leads/Won/Rate from last quarter) and polished table with hover states
- Dashboard redesign — personalized greeting header (time-aware + first name + date), `SectionDivider` with ruled-line separators between sections, fixed orphaned 2-card `lg:grid-cols-3` grid, all JSX comments removed; affects SuperAdmin, Advisor, and Manager dashboards
- `StatCard` — removed `hover:scale-105`, icon bg softened, horizontal flex layout, typography updated to uppercase tracking-wide labels + `text-2xl font-semibold tabular-nums` values, hover uses subtle `ring-border` transition
- `AdvisorDashboard` — meetings list uses `divide-y` row pattern with avatar initials, overdue tasks card gets `border-red-200` accent
- `ManagerDashboard` — team performance rows use left accent bar per role color, response times section uses uppercase label typography
- `CanonicalPathDictionary` — completely rewritten for Dominica CBI with 277 correct canonical paths covering main applicant (personal, passports, address, physical, work, bank, military), spouse, father, mother, father/mother-in-law, siblings 1–4, children 1–6, dependants 1–6, declarations, references 1–2, investment, medical, passport_app, agent, and application sections; old incorrect paths removed
- `SuggestedMappingDictionary` — fully corrected for all PDF templates: `form_d1` (263 fields — Part B is now employment/financial not spouse, Part C covers spouse/parents/siblings/children, Part D declarations, references), `form_d2` (11), `form_d3` (30, new), `form_d4` (14), `affidavit_sd` (6), `e_passport_application` (46, new)
- `CorrectDominiCbiFieldMappingsSeeder` — new seeder that replaces all `field_mappings` rows for the 6 templates above with the corrected canonical paths from `SuggestedMappingDictionary`

### Changed
- `LeadFormsFillView` Shared Information step — replaced `LEAD_INFO_FIELDS` with grouped `SHARED_INFO_FIELDS` covering Main Applicant (given_name, surname, dob, citizenship, gender, marital_status, email, phone_mobile, occupation, employer_name), Passport (passport_1 number/issuing_country/issue_date/expiry_date), Current Address, Spouse (surname, given_name, marriage_date/place), Investment (programme, amount_usd), and Application (submission_date, sign_date, sign_place); fixed wrong canonical paths (first_name→given_name, date_of_birth→dob, nationality→citizenship, phone_number→phone_mobile); renamed step label from "Lead Information" to "Shared Information"

### Fixed
- Super-admin dashboard lead delta no longer counts leads from the same calendar month in prior years — replaced non-sargable `whereMonth('created_at', ...)` with explicit `whereBetween` month ranges (correct year scoping + uses the `created_at` index)
- `LeadApplicationController::store` — changed `data` validation from `required` to `present` so creating an application on step 1 (before lead info fields are filled) no longer returns a 422 "The data field is required" error; defaults to `[]` when no data is supplied
- `Application::generateApplicationCode` — use `withTrashed()` so soft-deleted applications are included when finding the last sequence number, preventing duplicate code collisions on re-create
- `ProgramSchemaController` and `GenerationApiController` — fixed route parameter mismatch by moving schema endpoint out of lead-scoped group and adding `generations` method to `LeadApplicationController` with proper `Lead $lead` first parameter
- `FormsServiceClient::fillPdf` and `renderDocx` — send `new \stdClass` instead of `[]` for empty `applicant`/`context` so Pydantic `dict` validation passes

### Changed
- Lead application form converted from accordion layout to multi-step stepper — Step 1 collects Applicant Name and Passport Number; Step 2 shows hardcoded Lead Information fields (First Name, Surname, DOB, Nationality, Gender, Marital Status, Email, Phone, Occupation, Employer); admin-configured schema sections appear as Steps 3+ (main_applicant schema section suppressed to avoid duplication); "Next Step" shows on all but the last step; "Save & Finish" shows only on the last step; clicking Next auto-saves to the server; Back/Cancel navigation; step indicators show check-mark when completed
- Applied Laravel Pint code style fixes across 119 files (strict types, ordered imports, braces position, unary operator spacing)
- Updated CLAUDE.md pint rule to run `--test` then `--dirty` sequentially

### Fixed
- Lead application creation failing with "data field is required" when form is empty — changed `data` validation from `required` to `present` to allow empty arrays
- TypeScript errors in `useFormsAutomation.ts` — rewrote all `queryFn` and `mutationFn` with explicit typed axios generics so `response.data` is properly typed and satisfies TanStack Query v5 `NoInfer<TQueryFnData>` constraints
- TypeScript cast errors in `lead-records-documents.tsx`, `lead-records.tsx`, `lead-records-files.tsx`, `lead-records-notes.tsx` — added explicit casts at query data consumption sites for `StorageAccount`, `LinkedGoogleDriveFile`, `LeadFile`, `LeadFolder`, `LeadActivity`, and `ApiMeta` types

### Added
- Forms automation in lead Documents tab — "Forms Automation" section shows existing applications per lead; "New Application" button opens program selector then a structured data-entry form (collapsible schema sections with fill progress counters); Save creates/updates application; Generate queues server-side PDF batch; generations panel auto-polls and shows Download link when complete; Delete with confirmation
- `LeadApplicationController::destroy` — verifies lead ownership, soft-deletes application
- `LeadApplicationController::downloadGeneration` — verifies generation belongs to lead, serves ZIP file
- `useDeleteLeadApplication` React Query mutation hook
- Lead-scoped routes: `DELETE /api/leads/{lead}/forms/applications/{application}` and `GET /api/leads/{lead}/forms/generations/{generation}/download`
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
