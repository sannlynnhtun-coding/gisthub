# Implementation Plan: GitHub Dashboard Home

**Date**: 2026-11-19 | **Branch**: main (unchanged) | **Spec**: [spec.md](spec.md)

## Summary

Replace the root collection redirect with a GitHub telemetry dashboard using the existing GistHub shell and appearance tokens. Add Home as the first destination in the existing Home command group, with My Collection immediately second, in both Excel and Admin portal layouts. Keep the nine existing categories and every existing collection URL/action. Provide four dashboard views, public developer loading, repository exploration/inspection, and safe CSV export. Security, benchmark, and cadence examples are explicitly demonstrations, never account measurements.

## Technical Context

- Language/runtime: C#, .NET 10, Blazor WebAssembly; existing Tailwind CSS 3 and JavaScript interop.
- Dependencies: existing HttpClient, IGithubService/GithubService, AppState, JsonTableConverter, shared buttons/page styles, clipboard and download helpers. No new packages or remote UI/CDN dependencies.
- Storage: dashboard state is page-local and ephemeral; existing IndexedDB/profile/preferences remain untouched.
- External integration: public GitHub REST through the configured development/direct or production `/api/github` base URL. Never forward the stored profile token for dashboard requests.
- Testing: existing .NET executable regression harness and Node assert scripts; browser validation in both workspace layouts, existing appearance presets, keyboard and mobile widths.
- Scope: web app only; no Flutter, downloader, schema migration, or backend endpoint required.
- Data bounds: retrieve at most the 100 most recently updated public repositories. Label the loaded scope on summaries and exports; a full page is conservatively labeled potentially incomplete. No per-repository fan-out.
- Performance: two requests per valid load (identity then repositories), local filtering/sorting, no polling. Keep all views responsive at the bounded dataset size; avoid adding a timing promise dependent on GitHub.

## Constitution Check

No `.specify/memory/constitution.md` exists. Apply `rules.md` as the governing project rules. Pre-design gates PASS: specification/design decision recorded; existing workflows and profile isolation retained; shared appearance/persistence reused; scope limited to requested navigation and dashboard. No branch creation requested.

Post-design gates PASS: only public read operations, no saved data migration, unchanged collection destination/filter semantics, existing global shortcut ownership, theme-token styling, explicit demo/unavailable labels, and focused verification listed below. No unjustified violations or unresolved clarifications.

## Planning Workflow Limitation

The requested setup command was attempted but `.specify/scripts/powershell/setup-plan.ps1` does not exist. Neither a plan template nor a constitution is present. These design artifacts were authored directly using the skill’s required sections and the active `.specify/feature.json` pointer. No scaffold scripts or templates were invented. `.specify/extensions.yml` is absent, so there are no pre/post hooks to execute.

## Project Structure and Reach

- `GistHub/Pages/Start.razor`: retain the sole `/` route, replace storage-based redirect with dashboard content and page title; keep `Pages/Home.razor` at `/discovery` unchanged. Use a colocated `Start.razor.css` for dashboard-specific layout if existing utilities are insufficient.
- `GistHub/Layout/NavMenu.razor`: add `home` command before `my-collection`, render root NavLink with exact matching, send sidebar brand to root. Keep Home category name/order and all existing command IDs.
- `GistHub/Layout/MainLayout.razor`: point both brand links to root with Home accessible names; split empty-path Home label from `my-gists` label. Do not rewrite tool/draft or global search logic.
- `GistHub/wwwroot/js/quickAccess.js`: add matching `home` allowlist entry. Existing saved order/membership stays intact; do not auto-pin Home. `localSettings.js` already reuses this validator.
- `GistHub/Services/GithubService.cs`: add one public dashboard-load method to IGithubService and implementation; reuse request/base-URL/error handling patterns with a result-local error. Add public identity/repository DTOs in `Models/GithubDashboard.cs`. Keep existing gist methods and their error behavior stable.
- `GistHub/Services/GithubDashboardSummary.cs`: small pure calculations/filtering/projection helper only where shared by rendering/export/tests. Reuse `JsonTableConverter.Csv` rather than duplicate escaping. Keep view and inspector state in the page, not a new global store.
- Existing JS interop: reuse `copyToClipboard` and `appShell.js` `downloadBytes`. Add only minimal focus/dialog interop if existing components cannot supply it.
- Tests: add dashboard fixture/HTTP and calculation tests to `GistHub.RegressionTests` and invoke them from `Program.cs`; update its `ThrowingGithubService` implementation for the added interface member. Update `scripts/check-quick-access.mjs` and existing route/registry assertions only where the new Home behavior changes expectations. Add a focused dashboard browser scenario using the existing script harness.
- Documentation: small README navigation note after implementation; no unrelated shell/theme changes.

## Phase 0: Research Decisions

Completed in [research.md](research.md): routing, appearance reuse, public-only bounded retrieval, result-local errors/stale requests, honest demo views, safe export, and focused regression scope. No open research questions.

## Phase 1: Design

See [data-model.md](data-model.md) and [contracts/dashboard.md](contracts/dashboard.md).

Layout: shared header/sidebar/ribbon remains in charge. Page begins with Home heading, developer input/load status, and export action; four internal view buttons follow. Overview contains summary cards, language distribution, repository stars/forks and updated-month visualizations, then explorer. Inspection is a keyboard-accessible dialog/drawer with close/Escape and focus restoration. Use semantic headings and accessible text/table equivalents for charts.

Use inline SVG/CSS bars for the bounded charts, driven by semantic theme tokens and inheriting fonts. No canvas library, hardcoded reference palette, independent theme storage, or replacement command palette. Language distribution means repository primary-language counts, not source-byte composition; update timeline means repositories grouped by update month, not commits or contributions. Display open issue counts with a note that GitHub’s repository count can include pull requests.

Quality view measures only license/description/topics coverage over loaded repositories. Other security checks are unavailable unless shown inside an explicitly labeled demo section. Performance and cadence views use small deterministic example datasets with permanent Demo labels; any example control only changes local demo state. Do not include simulated values in the measured repository CSV.

Implementation order: public read result + summary tests; root dashboard/real overview; additional clearly labeled views + inspection/export; shared navigation and registry changes together; focused regression and browser verification. This is design sequencing, not a generated tasks backlog.

## Verification and Delivery Gates

Follow [quickstart.md](quickstart.md). Build and run the regression harness; verify shared command registry equality and Quick Access retention. Browser-check the full four-view flow with intercepted fixture responses, failure/overlap cases, safe export/clipboard outcomes, all appearance presets, and both workspace layouts at 375px/1440px. Confirm existing collection deep links, profile switching, CRUD/backup, tool drafts, and global search remain functional. Production base-path/proxy smoke test remains required before release.

## Complexity Tracking

No new dependency, persistence mechanism, server, permission scope, generalized dashboard framework, or theme catalog. All gates pass at design review; runtime verification belongs to implementation.
