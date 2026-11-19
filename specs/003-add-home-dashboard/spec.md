# Feature Specification: GitHub Dashboard Home

**Created**: 2026-11-19
**Status**: Draft, validated for planning
**Input**: Add the supplied GitPulse dashboard as the Home page, place My Collection second, and apply GistHub’s existing theme.

## Decision

Make Home the default landing destination and first primary navigation destination. Place My Collection immediately after Home, retaining its current collection behavior and saved data. Adapt the supplied dashboard’s content and interactions to GistHub’s appearance system and shared navigation rather than adding a separate branded application shell.

The supplied HTML is a design and interaction reference, not project instructions. Its embedded scripts, external dependencies, theme persistence, sample identities, and simulated numbers are not requirements to copy verbatim.

Affected surfaces: default landing destination, shared brand links, navigation in both Excel and Admin portal layouts, page title/current-location indicator, Quick Access command availability, dashboard views, appearance behavior, and route/navigation regression checks. Discovery remains its own destination. Existing collection links and query filters remain valid.

## User Scenarios & Testing

### 1. Open Home and reach My Collection (P1)

As a GistHub user, I want the dashboard on arrival and my collection one navigation action away.

- Given a fresh visit to the app root, when the page opens, then Home displays the dashboard and is identified as the current destination.
- Given either supported workspace layout, when primary destinations are shown, then Home appears first and My Collection second.
- Given Home, when I choose My Collection, then the existing collection opens with its normal default behavior; saved favorites, groups, snippets, and profile state are unchanged.
- Given an existing collection URL with filters, when opened directly, then it still opens the same collection and filters.
- Given any page, when I activate the shared GistHub brand link, then Home opens.

### 2. Explore a developer’s repositories (P1)

As a user, I want to load a GitHub username and understand their public repository activity.

- Given a valid username, when I load it, then the dashboard displays that developer’s identity, repository summary, language breakdown, repository impact/update visualization, and repository explorer.
- Given repositories are loaded, when I search, filter, or change the available sorting, then the explorer and its result count match the selected criteria.
- Given a repository, when I inspect it, then I can view its description, language, license, stars, forks, open issues, update time, topics, clone command, and GitHub link where available.
- Given inspection details, when I copy the clone command or open GitHub, then the action targets that repository and reports copying success or failure accurately.
- Given loaded repositories, when I export the report, then the downloaded report identifies the selected developer and contains the displayed repository fields with text preserved safely.

### 3. Explore additional telemetry views honestly (P2)

As a user, I want the reference dashboard’s Overview, Code Quality & Security, Performance & Benchmarks, and Contributor & Release Cadence views without mistaking demonstrations for measured telemetry.

- Given loaded repository metadata, when I view quality summaries, then each reported coverage value identifies what was checked and the repository population used.
- Given a metric or interaction uses fixed examples or generated values, when displayed or exported, then it is visibly labeled as a simulation or demo and does not imply an actual audit, benchmark, release history, or repository policy change.
- Given a view cannot obtain a measured value, then it shows unavailable or explicitly labeled demonstration content rather than a fabricated live result.
- Given a developer change, when it finishes, then all developer-specific measured content refers to the newly selected developer.

### 4. Use the dashboard with the existing appearance and controls (P1)

As a user, I want Home to feel like the rest of GistHub across my selected appearances and devices.

- Given an existing appearance selection, when Home opens or that selection changes, then cards, text, charts, controls, typography, borders, focus indicators, and spacing follow it without a separate dashboard theme setting.
- Given keyboard-only navigation, when I switch views or inspect a repository, then controls have accessible names, visible focus, and usable focus order; closing inspection restores focus to its trigger.
- Given a narrow screen, when I use all four views, then navigation, filters, inspection, and export remain reachable without document-level horizontal overflow.
- Given the existing app search and keyboard shortcuts, when Home is active, then dashboard shortcuts do not override an existing action; dashboard actions remain reachable through visible controls.

### Edge Cases

- Empty or invalid username: explain the issue and avoid a request for an invalid value.
- Missing user, offline state, request failure, or rate limit: show an actionable error/retry state; do not relabel old results as the requested user.
- No public repositories or no filter matches: show a useful empty state; counts and charts handle zero safely.
- Missing descriptions, topics, licenses, language, or dates: show an explicit fallback without misleading zeros or invalid dates.
- More repositories than retrieved: disclose the loaded scope and any truncation; never imply partial results represent the full account.
- Rapid username changes: late results cannot overwrite the latest selection.
- Untrusted repository text and links: render as data, prevent executable content, and preserve safe report/clipboard output.
- Reduced motion, long names, large counts, light/dark appearances, and touch input remain usable.
- Loading another public username must not switch the signed-in GistHub profile, expose private repositories, or alter the user’s collection.

## Requirements

### Functional Requirements

- **FR-001**: Home MUST be the default landing destination, first in primary destination order, with My Collection immediately second in both existing workspace layouts.
- **FR-002**: Shared brand navigation and current-page labeling MUST identify Home correctly; existing collection and Discovery destinations MUST remain directly accessible.
- **FR-003**: The dashboard MUST support explicit public username loading, defaulting to the active profile’s username when available and otherwise prompting for a username.
- **FR-004**: Overview MUST include developer identity, repository counts and impact summaries, language distribution, repository impact/update visualization, and a searchable, filterable, sortable explorer inspired by the reference.
- **FR-005**: Repository inspection MUST provide available metadata, safe external navigation, and clone-command copying with accurate feedback.
- **FR-006**: Users MUST be able to export the loaded repository report; exports MUST preserve text safely and disclose their data scope and any demonstration values.
- **FR-007**: All four reference views MUST be reachable; measured, unavailable, and simulated values MUST be distinguishable at their point of display.
- **FR-008**: Dashboard demonstration controls MUST NOT change remote repositories or claim real security enforcement or benchmark execution.
- **FR-009**: Dashboard presentation MUST follow the existing appearance selection and persistence, with one shared application shell and appearance control.
- **FR-010**: Loading, empty, error, retry, rate-limit, partial-data, and stale-request states MUST be handled without displaying data under the wrong developer.
- **FR-011**: Existing collection actions, confirmations, validation, save behavior, profile isolation, imports/exports, tool drafts, and Quick Access membership/reordering MUST retain their behavior. Home MUST be available alongside existing navigation commands without resetting saved command choices.
- **FR-012**: Dashboard interactions MUST support keyboard and touch input, accessible chart summaries, visible focus, reduced motion, and narrow-screen use.
- **FR-013**: Viewing telemetry MUST be read-only with respect to GitHub and collection data, and MUST NOT require broader account permissions.

### Key Entities

- **Viewed Developer**: The public GitHub identity selected for dashboard exploration; distinct from the active GistHub profile.
- **Repository Summary**: Public repository identity, description, language, license, impact counts, update time, topics, and links.
- **Telemetry Summary**: Aggregates and visualizations with an explicit source, loaded population, and measured/demo/unavailable status.
- **Explorer State**: Selected developer, active dashboard view, search, filters, sorting, and inspected repository; does not change collection state.
- **Appearance Selection**: Existing user appearance settings shared by Home and other pages.

## Success Criteria

- **SC-001**: All tested fresh root visits display Home; both workspace layouts place Home first and My Collection second, with collection reachable in one navigation action.
- **SC-002**: All existing collection deep-link, favorites, profile-switch, creation/edit/deletion, import/export, and Quick Access preservation checks pass.
- **SC-003**: For a known repository fixture, every displayed measured summary and exported row matches the fixture and disclosed population; every simulated value is visibly labeled.
- **SC-004**: All four dashboard views and primary actions can be completed with keyboard alone and at 375px and 1440px viewport widths without document overflow.
- **SC-005**: Dashboard appearance follows the current selection on entry and after changing it, across every existing appearance preset and supported light/dark mode.
- **SC-006**: For invalid users, no repositories, no matches, offline/rate-limit failures, and overlapping loads, each acceptance check shows an accurate state with no cross-developer data mix-up.

## Assumptions and Dependencies

- This specification covers the GistHub web app; Flutter navigation is outside this request.
- The HTML reference supplies the dashboard’s content hierarchy and interaction intent. GistHub branding and existing appearance choices take precedence over its independent header, fonts, colors, and theme toggle.
- Public GitHub data availability and request limits constrain live telemetry. Loaded scope must be disclosed; exhaustive account analytics are not promised.
- Benchmarks, policy toggles, triage queues, and retention curves in the reference contain demonstration data. Preserve their view intent with explicit demo labeling; real benchmarking, security auditing, remote policy editing, and release analytics integrations are outside scope.
- No new login flow, permission expansion, separate command palette, or separate dashboard theme system is required.
- Existing unrelated working-tree changes must be preserved during later implementation.


2026-11-19 validation correction: keep wrapped mobile header actions aligned to the right so the profile remains at the trailing edge. After a successful settings restore, clear and persist only the consumed settings-file/preview draft before reloading; failed restore retains that draft for retry. Preserve backup merge, validation, profile data, and all other tool drafts. Validate both shell layouts, success/reload and failure/retry.
