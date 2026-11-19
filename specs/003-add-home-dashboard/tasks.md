# Tasks: GitHub Dashboard Home

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/dashboard.md](contracts/dashboard.md), [quickstart.md](quickstart.md)
**Created**: 2026-11-19
**Scope**: Web dashboard at `/`, existing theme system, Home first and My Collection second inside the existing Home command group in both shell layouts. Preserve collection routes, Discovery, stored data and saved Quick Access choices. No new dependency, separate theme, backend, Flutter change, or persistent dashboard store.

Paths below are repository-relative. Execute from repository root. Implementation tasks are completed except the explicitly pending cross-cutting/release gates recorded at the end. Tests are included because the feature specification explicitly requires fixture, regression, workflow-preservation and browser checks. Write focused failing checks before the corresponding nontrivial implementation; use the existing executable/Node/browser harnesses.

**Scaffold limitation**: `.specify/scripts/powershell/setup-tasks.ps1` was attempted but is absent; no tasks template exists. This file follows the supplied skill structure directly, using `.specify/feature.json` to resolve this feature. No constitution or `.specify/extensions.yml` exists; project `rules.md` applies and no pre/post hooks are registered.

## Phase 1: Setup

**Goal**: Preserve the existing working tree and prepare deterministic validation without adding scaffolding or dependencies.

- [X] T001 Inspect current changes and existing command/service callers in `GistHub/Layout/NavMenu.razor`, `GistHub/Layout/MainLayout.razor`, `GistHub/Services/GithubService.cs`, `GistHub.RegressionTests/Program.cs` and `scripts/check-quick-access.mjs`; record the baseline in `specs/003-add-home-dashboard/quickstart.md`, preserve unrelated edits and retain the current branch unless instructed otherwise.
- [X] T002 Identify the existing browser harness entry point used by `scripts/test-quick-access.mjs` and document its exact runnable invocation in `specs/003-add-home-dashboard/quickstart.md`; prepare inline deterministic public-user/repository fixtures in `GistHub.RegressionTests/GithubDashboardTests.cs` covering missing fields, private-marked rows, malicious text/URLs, zero rows, 100 rows and errors, without adding packages.

## Phase 2: Foundational prerequisites

**Goal**: Establish a bounded, public-only result contract usable by the dashboard stories. Complete before story implementation.

- [X] T003 Define the public dashboard result, developer and repository DTOs in `GistHub/Models/GithubDashboard.cs` per `data-model.md`: username “1–39 ASCII alphanumerics/hyphens, no leading/trailing or consecutive hyphens”; developer “canonical login, optional display name/bio/avatar, public-repository count if supplied, validated profile URL”; repositories “up to 100 public repository records from one sorted page”; loaded time “UTC timestamp”; scope “page limit 100, possibly truncated when count equals limit”; error “optional GithubApiError including status/message/rate-limit reset”. Preserve repository “nullable description/language/license SPDX name”, “nonnegative stars/forks/open-issue counts”, “nullable update timestamp”, topics, stable ID, owner/full name, fork/archive flags and validated GitHub HTTPS URL; preserve missing values and exclude private-marked rows from display/totals.
- [X] T004 Add focused fake-HTTP assertions in `GistHub.RegressionTests/GithubDashboardTests.cs` for username trimming/optional @ removal and boundary validation, exact public paths, no Authorization header, at most two requests, zero/full-page scope, malformed responses, 404, 403/429/reset and network failures; register these checks in `GistHub.RegressionTests/Program.cs` before implementing the service operation.
- [X] T005 Add `GetPublicDashboardAsync(string username)` to IGithubService/GithubService in `GistHub/Services/GithubService.cs` and update every implementation/fake including `GistHub.RegressionTests/Program.cs`; reuse the configured base URL and request/error patterns, GET identity then the first 100 updated public repositories, return an atomic result with request-local error information, do not let overlapping dashboard calls or existing gist calls overwrite another operation’s error, and retain all existing gist signatures/error behavior. Pass T004 checks without accepting a profile token or making remote mutations.

## Phase 3: US1 — Open Home and reach My Collection (P1)

**Goal**: Root opens Home and the shared Home group lists Home before My Collection.
**Independent test**: Root renders Home with and without bookmarks/profile; both layouts show the destination order; brand links return Home; collection/deep-link filters and Discovery remain unchanged.

- [X] T006 [US1] Add root/navigation and command-order assertions in `scripts/test-home-dashboard.mjs`, integrated through the harness identified in T002, and extend `scripts/check-quick-access.mjs` only as needed to verify `home` registry parity, exact root matching and unchanged `my-collection` favorites destination; prove older saved Quick Access arrays retain membership/order without auto-pinning Home.
- [X] T007 [US1] Replace the storage-based redirect in `GistHub/Pages/Start.razor` with the sole `/` Home dashboard page, shared page heading/title and a useful signed-out username-entry state; remove the root bookmark lookup and leave `GistHub/Pages/Home.razor` at `/discovery` unchanged. Render the basic Overview surface to be populated in US2 rather than a collection redirect.
- [X] T008 [US1] Prepend the `home` command in `GistHub/Layout/NavMenu.razor` and `GistHub/wwwroot/js/quickAccess.js` in identical registry order, use exact-active root navigation and update its sidebar brand link; update both brand links/accessible names and separate root Home from My Collection labels in `GistHub/Layout/MainLayout.razor`. Keep the nine categories and every existing command, collection href and preference unchanged.
- [X] T009 [US1] Run `scripts/check-quick-access.mjs` and the US1 browser scenario in `scripts/test-home-dashboard.mjs`; exercise root with/without bookmarks/profile, both shell layouts, brand links, `/my-gists`, favorites/filter URLs and `/discovery`, then record outcomes in `specs/003-add-home-dashboard/quickstart.md`.

## Phase 4: US2 — Explore a developer’s repositories (P1)

**Goal**: Public developer loading, accurate overview, local explorer, inspection and safe export work end to end.
**Independent test**: Known fixtures produce exact summaries/rows; filtering, sorting, inspection, copying and CSV succeed; failures, missing data and overlapping loads remain honest and isolated.

- [X] T010 [US2] Extend `GistHub.RegressionTests/GithubDashboardTests.cs` with expected totals/language buckets/top-seven/month ordering, zero denominators, filter/sort ties, invalid links/clone identifiers and CSV formula/quote/newline cases; add controlled A/B completion and profile-change/disposal checks using the existing page-test pattern, and register any new runner in `GistHub.RegressionTests/Program.cs`.
- [X] T011 [US2] Implement only shared pure summary/filter/export projections in `GistHub/Services/GithubDashboardSummary.cs`: “primary-language repository counts including Unknown”, “top seven repositories by stars with forks as comparison”, chronological update months, “Empty population yields zero counts and no percentage claim”, and “Stable ID/name tie-breakers make sorting deterministic”. Reuse `JsonTableConverter.Csv` for export rather than introducing another serializer.
- [X] T012 [US2] Implement ephemeral loading/lifecycle in `GistHub/Pages/Start.razor`: active view “overview, quality, benchmarks, cadence; default overview”; status “idle, loading, success, empty, error”; “validation error does not issue network requests”; increment load revision on load/profile change/disposal, discard obsolete completions, clear old identity/rows/inspection/filters on load while retaining active view, commit developer/rows atomically, show retry/rate-limit/partial-scope states and unsubscribe on disposal. Default from the active profile when ready, prompt when signed out, and never change AppState/profile/token/collection storage.
- [X] T013 [US2] Render developer identity and measured overview cards/charts in `GistHub/Pages/Start.razor` using shared semantic styles and SVG/CSS: language repository distribution, stars/forks comparison and repository-update month timeline, loaded-count/100-row scope and potential truncation label. Label issue counts as potentially including pull requests and use explicit missing/empty fallbacks; never describe update counts as contributions.
- [X] T014 [US2] Implement explorer in `GistHub/Pages/Start.razor`: “case-insensitive name/description match”, “language: exact selected primary language or all”, “sort: updated descending by default, stars descending, forks descending, or name ascending”, “filter then sort”, “Unknown update dates sort last”; show the matching result count and distinct no-repository/no-match states without changing summary population.
- [X] T015 [US2] Implement repository inspection in `GistHub/Pages/Start.razor` with selected stable ID, available metadata/topics and missing fallbacks, validated GitHub HTTPS links, safe clone identifiers and reused `copyToClipboard` feedback including denial/manual copy; use an existing accessible dialog pattern or minimal native-dialog interop in `GistHub/wwwroot/js/appShell.js` if required, supporting close/Escape/focus containment/restoration and never executing clone text.
- [X] T016 [US2] Implement Export loaded repositories in `GistHub/Pages/Start.razor` and its projection in `GistHub/Services/GithubDashboardSummary.cs` using `JsonTableConverter.Csv` and existing `appShell.js` downloadBytes; export “all loaded public rows, independent of explorer filters” with “Export disabled without successful data or when zero rows”. Follow exact columns/UTC timestamps/scope in `specs/003-add-home-dashboard/contracts/dashboard.md`, use a safe canonical-username filename, exclude demos and report failures accurately.
- [X] T017 [US2] Extend `scripts/test-home-dashboard.mjs` with intercepted deterministic responses to verify loaded identity/summary, all filters/sorts, safe inspection, clipboard success/denial, CSV contents/download failure, missing fields/unsafe links, 404/offline/rate-limit/empty/full-page scope and delayed A/B/profile-switch results; assert no dashboard storage writes or authenticated/private API requests.
- [X] T018 [US2] Run the .NET regression harness and US2 browser scenario through `GistHub.RegressionTests/Program.cs` and `scripts/test-home-dashboard.mjs`, fix failures within the touched dashboard files and record fixture outcomes in `specs/003-add-home-dashboard/quickstart.md`.

## Phase 5: US4 — Existing appearance and controls (P1)

**Goal**: The dashboard follows the existing appearance picker and works with keyboard, touch and narrow screens. Retain spec story number US4 despite executing it before P2 US3.
**Independent test**: Changing any existing appearance updates the mounted dashboard; keyboard-only flow and inspection work; at 375px/1440px neither shell layout causes document overflow or shortcut conflicts.

- [X] T019 [P] [US4] Add appearance/responsive/accessibility assertions to a new `scripts/test-home-dashboard-appearance.mjs` using the browser harness from T002: both layouts, all existing presets and supported light/dark modes, change while mounted, 375px/1440px, long metadata, touch/focus targets, reduced motion, chart text equivalents, inspector focus restoration and unchanged global search shortcut; do not introduce a new accessibility library.
- [X] T020 [US4] Complete dashboard-specific responsive styling in `GistHub/Pages/Start.razor.css` and matching markup in `GistHub/Pages/Start.razor`, only where shared utilities are insufficient; reuse existing background/card/foreground/primary/secondary/muted/border/ring tokens, radius and UI font. Keep the current ThemeToggle/persistence and shell, allow contained table scrolling and prevent document overflow; add no CDN, reference palette or independent theme control.
- [X] T021 [US4] Complete accessible names, semantic headings/current-view controls, chart text/table equivalents, status announcements, visible focus and reduced-motion support in `GistHub/Pages/Start.razor` and `GistHub/Pages/Start.razor.css`; finish inspector keyboard behavior through the existing helper in `GistHub/wwwroot/js/appShell.js` only if needed and preserve global shortcut ownership.
- [X] T022 [US4] Run `scripts/test-home-dashboard-appearance.mjs` through the existing browser harness plus a keyboard-only inspection/export pass and record the preset/layout/width matrix in `specs/003-add-home-dashboard/quickstart.md`; resolve any contrast, focus, overflow or touch failures before P2 delivery.

## Phase 6: US3 — Additional telemetry views honestly (P2)

**Goal**: Four usable views distinguish measured repository metadata, unavailable metrics and demonstrations.
**Independent test**: Fixture quality numerator/denominator values are exact; all additional views are reachable; demo labels remain adjacent and no example control makes remote changes or contaminates CSV.

- [X] T023 [US3] Add quality-coverage assertions in `GistHub.RegressionTests/GithubDashboardTests.cs` and four-view/demo browser expectations in `scripts/test-home-dashboard.mjs`: license/description/topic numerator/denominator, empty population, developer switch, unavailable security values, permanent Demo labels and zero remote mutation requests during demo interaction.
- [X] T024 [US3] Add measured license/nonempty-description/topics coverage projections to `GistHub/Services/GithubDashboardSummary.cs` and the Code Quality & Security view in `GistHub/Pages/Start.razor`; show population counts and unavailable unchecked policies explicitly. Keep any policy simulation clearly separate and local; do not add real security enforcement or triage integrations.
- [X] T025 [US3] Complete four-view navigation and Performance & Benchmarks and Contributor & Release Cadence views in `GistHub/Pages/Start.razor` with small deterministic example series/matrix, permanent adjacent Demo labels, accessible data equivalents and existing theme styles from `GistHub/Pages/Start.razor.css`; any example interaction changes only local demo state. Keep developer-specific measured content tied to the current result and exclude demonstrations from CSV.
- [X] T026 [US3] Run US3 regression/browser scenarios in `GistHub.RegressionTests/Program.cs` and `scripts/test-home-dashboard.mjs`, then rerun the appearance/accessibility scenario from `scripts/test-home-dashboard-appearance.mjs` for the newly added views; record exact quality/demo/export-separation outcomes in `specs/003-add-home-dashboard/quickstart.md`.

## Phase 7: Polish and cross-cutting verification

- [X] T027 Run the build, regression executable, registry checks and keyboard shell checks listed in `specs/003-add-home-dashboard/quickstart.md` against `GistHub/GistHub.csproj`, `GistHub.RegressionTests/GistHub.RegressionTests.csproj`, `scripts/check-quick-access.mjs` and `scripts/test-admin-portal.mjs`; run the integrated dashboard browser scenarios, resolve failures and record commands/results without claiming unexecuted checks.
- [X] T028 Verify existing collection creation/edit/deletion confirmations, favorites/filter links, profile isolation, bookmark/settings backups and old/new Quick Access restoration, tool draft/back flows and global search using the existing scenarios in `scripts/test-quick-access.mjs`, `scripts/test-profile-menu.mjs` and the regression harness; record any manual gaps in `specs/003-add-home-dashboard/quickstart.md` and keep unrelated workflows intact.
- [ ] T029 Smoke-test Home and public dashboard requests under the deployed base path/proxy configured by `GistHub/Program.cs`, `GistHub/vercel.json` and `GistHub/wwwroot/vercel.json` on an already available deployment; record results in `specs/003-add-home-dashboard/quickstart.md`. Do not deploy as part of this task; if no deployment exists, leave this release gate explicitly pending rather than treating local direct-API success as proxy validation.
- [X] T030 Update `README.md` with Home-first navigation, unchanged My Collection access, shared appearance behavior, loaded-public-data scope and demo labels; update `specs/003-add-home-dashboard/quickstart.md` with final evidence and outstanding release gates, and review the diff to ensure no new package, storage migration or unrelated edits were introduced.

## Dependencies and completion order

Setup T001 → T002 → foundation T003 → T004 → T005.

US1 T006 → T007 → T008 → T009. US2 starts after US1: T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018. US4 starts after US2: T019 may run alongside T020 → T021, then T022 waits for all three. US3 follows the P1 stories: T023 → T024 → T025 → T026. T027 → T028 → T029 → T030 complete delivery evidence; an unavailable deployment keeps T029 pending but does not prevent documenting local results in T030.

Story dependency graph: Foundation → US1 → US2 → US4 → US3 → final verification. US1 can be independently accepted as a themed landing/navigation increment; US2 supplies working telemetry; US4 completes P1 usability; US3 adds the remaining views. Same-page work is deliberately serialized rather than falsely marked parallel.

## Parallel execution examples by story

- **US1**: After foundation, navigation browser assertions in T006 can be authored independently of the initial root markup in T007 if the failing-check-first sequence has been captured; merge T007/T008 together before verification. Do not edit NavMenu/registry order concurrently.
- **US2**: After T011 defines projections, review fixtures/expected CSV outputs in `GistHub.RegressionTests/GithubDashboardTests.cs` while implementing page loading in `GistHub/Pages/Start.razor`. Keep T012–T016 page edits serialized; no task is marked [P] because its main acceptance depends on those evolving contracts.
- **US4**: T019 [P] writes the separate browser scenario while T020/T021 change page/CSS. T022 waits for both work streams. This is the explicit independently editable parallel task.
- **US3**: Review quality expectations/fixtures in `GistHub.RegressionTests/GithubDashboardTests.cs` while implementing demo markup in `GistHub/Pages/Start.razor`, once T023 expectations are defined. T024/T025 share the page and must not be edited simultaneously.

Parallel examples describe optional coordination; they do not require spawning agents or relaxing dependency/test gates.

## Implementation strategy and MVP

Deliver US1 first as the smallest independently reviewable root/navigation change. The useful dashboard MVP includes all P1 stories (US1 + US2 + US4): public overview/explorer, inspection/export and the current theme across supported layouts/devices. US1 alone is a landing/navigation increment, not a finished telemetry dashboard. Add P2 US3 next to fulfill the complete four-view specification. Run focused checks after each increment; broaden verification only for the final cross-cutting gate or newly affected behavior.

## Coverage and format validation

Implementation status: 29/30 tasks completed. T028 now passes: wrapped header actions remain right-aligned, successful settings restore clears its consumed draft before reload, failed restore retains input, and all local regression/browser suites pass. T029 is partially validated: the confirmed public deployment at https://gist-hub.vercel.app serves its shell and both public GitHub proxy endpoints successfully, but it still redirects root to the older My Collection page. Production acceptance of the new Home dashboard remains pending a deployment; this task explicitly excludes deploying. See quickstart.md for evidence. The requirements-quality checklist was not edited.

- FR-001–002: T006–T009; FR-003/010/013: T003–T005, T010, T012, T017–T018.
- FR-004: T010–T014; FR-005: T015, T017, T019–T022; FR-006: T010–T011, T016–T018.
- FR-007–008: T023–T026; FR-009/012: T019–T022 plus T026; FR-011: T006–T009 and T027–T028.
- SC-001: US1; SC-002: US1 and final preservation checks; SC-003: US2/US3 fixtures/export; SC-004–005: US4 and four-view rerun; SC-006: foundation/US2 error and race scenarios.
- Total: 30 tasks; setup 2, foundational 3, US1 4, US2 9, US4 4, US3 4, final 4.
- All tasks use unchecked boxes, unique sequential IDs, story labels only in story phases, and explicit file paths. Only T019 has [P]; other optional review parallelism must respect the stated contracts and shared-file sequencing.
