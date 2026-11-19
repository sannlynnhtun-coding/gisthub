# Feature Specification: Signed-in Dashboard Analytics

**Created**: 2026-11-19
**Status**: Draft
**Input**: Remove the redundant public developer header and picker, paginate Live Repository Explorer, and add Overview, Repos, and Code Review within Home’s Overview.

## Decision

Use the currently selected GitHub account as Home’s identity. Replace the highlighted public developer region with a compact page title and retain access to CSV export, loading feedback, and retry. Keep the existing dashboard tabs and visuals. Append the analytics views within the existing Overview, using the ObsidianUI dashboard as a reference for the information hierarchy while following GistHub’s own appearance and navigation.

## User Scenarios & Testing

1. **P1 · Open Home as the signed-in account.** With an active GitHub profile, open Home and verify repository data starts loading without a username field, profile pills, or a second sign-in. Switch profiles and verify previous account content clears immediately and the new profile loads automatically.
2. **P1 · Browse repositories in pages.** With 23 matching repositories, verify eight pages, with three rows per full page and two on the last page, with correct ranges. Change search, language, or sort from page 3 and verify page 1 contains the first results of the full filtered and sorted set. Open a repository and close the inspector to verify focus returns to its row. Export and verify the current page does not limit the export.
3. **P2 · Navigate the appended analytics views.** From the existing Overview, switch among Overview, Repos, and Code Review. Verify Overview presents engineering metrics and activity, Repos presents searchable repository cards, and Code Review presents pull request status filters and a read-only detail view. Verify the existing top-level dashboard views remain available.

### Edge Cases

- With no active profile, point to the existing sign-in flow. An expired token or failed request shows the appropriate recovery action without falling back to a different identity.
- A response that arrives after a profile switch must not replace the new account’s data. Credentials and results must stay within their account boundaries.
- Zero repository matches show an empty state and no active paging controls. Exactly 3 matches fit on one page. If the result set shrinks, no page beyond the last page can remain selected.
- Missing activity, contributors, pull requests, or review timing are shown as unavailable. A genuine empty result remains distinguishable from an unavailable metric.
- Paging and analytics navigation work by keyboard at narrow and desktop widths. Selection is conveyed through text or accessibility state as well as color.

## Requirements

### Functional Requirements

- **FR-001** Home must use the active GitHub profile automatically and remove the annotated public profile summary, example profile selector, public username form, and redundant scope/status copy from the header.
- **FR-002** Home must retain existing CSV export and surface actionable loading, error, and retry states without reintroducing the removed developer picker.
- **FR-003** Live Repository Explorer must filter and sort all loaded rows before paging. Use 3 rows per page by default and provide Previous, Next, and the visible range and total. Return to page 1 after any filter, sort, or account change.
- **FR-004** Pagination must preserve current repository detail actions and the existing scope of export. It must not imply the app fetched repositories beyond the loaded dataset.
- **FR-005** Append three labeled views inside the existing Overview. Analytics Overview presents commit and pull request metrics, review timing, activity by period, contributors, and recent pull requests when available. Repos offers searchable cards for the account’s loaded repositories. Code Review offers status filters, pull request details, and links to GitHub when available.
- **FR-006** The appended views must use data available to the active account and state their coverage. They must distinguish measured data, unavailable data, and any existing demo illustrations.
- **FR-007** Preserve the existing workspace navigation, top-level dashboard tabs, repository inspector, and GitHub account controls. The new review surface is read-only and does not add GitHub writes, an assistant, or reference Settings.

### Key Entities

- **Active GitHub profile** identifies the account whose dashboard data is shown.
- **Repository result set** contains the loaded repositories and their current filtered, sorted page.
- **Analytics period** identifies the time range associated with activity and contributor metrics.
- **Pull request** belongs to a repository and carries a review status and optional timing and detail information.

## Success Criteria

- Signed-in users can open Home with zero manual profile selections or username submissions.
- Every 23-row fixture produces the expected eight pages, with all matching rows reachable exactly once for a stable sort.
- All three appended views are reachable within Overview, and all existing top-level views remain reachable.
- Account-switch tests show zero previous-account rows or metrics after the switch starts. No fixture or unavailable metric appears as a measured value.

## Assumptions and Dependencies

- “Append” means add an analytics section below the existing Overview content with its own three views. It does not mean replace the existing Overview or add a new workspace sidebar.
- Existing access and token permissions define visibility. Broader private or organization data access is outside this feature unless separately authorized.
- The design reference is [ObsidianUI Analytics Dashboard](https://www.obsidianui.dev/docs/analytics-dashboard).

## Analytics visual refinement

Overview uses animated metric cards, a time-labeled commit chart split by contributor, and contributor and pull request lists. Repos uses a searchable card grid with language, stars, and forks. Code Review uses a status-coded queue with a responsive details pane. All three use the existing GitPulse palette and honor reduced motion. Verify the period switch, repository inspector, status filter, and existing review details link with signed-in data.

### Home Overview presentation pass

Give Overview a compact, palette-aware page header, a consistent card hierarchy, and more room for the repository table. Keep the ecosystem visualization beside the explorer on wide layouts without stretching it to match the table height. At narrow widths preserve reading order and access to every control. Refine the analytics chart and contributor panel without changing chart values, motion, account scope, tab selection, pagination, or export. Verify the existing browser dashboard checks and both motion preferences.

### Unified Home Overview

Place signed-in analytics and repository activity inside the same Overview, with analytics first and the demo widgets in a labeled group below. Use a shared canvas and consistent card spacing. Preserve the analytics tabs, explorer state, navigation, charts, motion, and signed-in data. Check tab switching, paging, inspection, and responsive/reduced-motion behavior in the browser.

### Dashboard navigation refinement

Remove the nested analytics heading and navigation. Keep the charts in Overview, add Repos to the main dashboard tab row, and append the live Code Review queue after the existing Quality & Review content. Recent pull requests open their selected details in the relocated queue. Reuse the current account analytics request while switching tabs and clear it on account changes.

### Compact repository browsing and staggered cards

Show three repository rows per page. Keep filters, sort, inspection and export behavior. Place activity widgets in two independently stacked columns at wider widths, with one column on narrow layouts. Preserve card and chart animations and verify page boundaries and filter reset.

### Compact dashboard toolbar

Replace the standalone title banner with a responsive dashboard toolbar containing the page heading, existing view tabs, and CSV export. Keep the export disabled state and data scope. Verify tab navigation and export accessibility in both workspace layouts.

### Token-scoped Home data and metric icons

Show the active account’s repositories that its GitHub token can read, including private repositories. Home validates the token identity, uses authenticated requests, keeps live data in the account session and never falls back to anonymous reads. Use the same repository set for the explorer, repository cards, quality summaries, city, and local CSV export. Commit and pull-request search remains bounded and reports partial coverage. Label private repositories and keep simulations explicitly labeled. Add decorative icons to the four summary cards. Verify private fixture visibility, paging, account switching, and the absence of an anonymous fallback.

### Phone layout across Home views

Make the dashboard toolbar, filters, cards and inspector fit narrow screens. Keep dense tables in labeled, keyboard-scrollable regions. On phones show full-size, labeled repository selectors below the animated city map. Keep review details close to the selected queue on phones and preserve desktop interactions. Verify all five views in both workspace layouts at 320 and 390 pixels, including repository inspection and the Cadence matrix.
