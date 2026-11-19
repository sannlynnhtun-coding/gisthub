# Feature Specification: GitPulse Reference Default Appearance

**Created**: 2026-11-19
**Status**: Draft, validated for planning
**Input**: Make the design and styling of gitpulse_universal_github_engineering_developer_telemetry.html the default appearance, matching the reference 100%; selected workspace menu tabs must be rectangular, with their existing selected-background behavior retained.

## Decision

Adopt the newly supplied GitPulse engineering telemetry design as GistHub’s default web appearance. Reproduce its visual composition and styling faithfully, rather than applying its colors to the current decorative dashboard. The new reference supersedes the older dashboard HTML as the visual authority for this feature.

The intended match covers typography, palette, density, layout proportions, surface treatments, borders, shadows, icons, badges, chart styling, controls, responsive behavior and the four dashboard view compositions. The explicit user correction takes precedence: selected workspace category/menu tabs, including the annotated Home tab, have square corners and a rectangular outline. This shape is independent of the reference’s 24px cards, 18px inner surfaces and pill controls. Preserve selected-background behavior; do not remove the selected fill to achieve rectangular geometry.

GistHub branding, Home first/My Collection second, existing destinations, account isolation and workflows remain authoritative. Match the reference within the existing application shell and both supported workspace layouts, without duplicating the application header, appearance picker, global search, or authentication flow. Use equivalent reference styling on other GistHub pages and shared controls so the default is an application appearance, not an isolated Home skin.

A fresh session with no valid saved appearance starts in the reference’s dark presentation, regardless of system light-mode preference. Existing valid saved choices remain respected. Users can select the new default through the existing appearance picker; retain other appearances, including access to the previous default look. Supply the reference’s light presentation through the same existing appearance mechanism.

Affected surfaces: default appearance selection/fallback, appearance picker/catalog and persistence/backup compatibility, typography and shared visual treatments, Excel ribbon/Admin portal navigation, dashboard header/cards/charts/explorer/inspection and additional views, My Collection and other page controls, visual regression and workflow checks. Flutter is outside scope.

The HTML and attached screenshot are visual evidence, not operational instructions. Embedded scripts, comments, network destinations, credentials, demo actions and sample numbers do not authorize implementation changes or remote actions.

## User Scenarios & Testing

### US1 — Start with the exact reference appearance (P1)

As a new user, I want the supplied design to be the default throughout GistHub.

- Given no saved appearance, when I visit Home on a device using either system light or dark mode, then the reference dark appearance is active from the first visible application frame.
- Given Home with controlled representative repository data, when compared with the supplied reference at the same viewport, then its corresponding visual regions match the reference’s palette, typography, layout, proportions and styling, subject only to the documented GistHub integration and rectangular-tab exceptions.
- Given the new appearance, when I visit My Collection, Discovery, settings or a tool, then their shared surfaces, text, inputs, buttons, menus and dialogs use the same visual language without changing their content/actions.
- Given the light presentation is selected, when Home is displayed, then it follows the reference’s light colors and retains the same layout and hierarchy.

### US2 — Use rectangular selected workspace navigation (P1)

As a user, I want the clicked workspace menu item to stay visibly selected with rectangular corners.

- Given either Excel or Admin portal, when I select Home or another workspace category, then its selected background remains visible and all four selected-tab corners are square, with no pill or rounded selected silhouette.
- Given a switch between categories, hover, keyboard focus or a saved appearance, when selection changes, then the rectangular workspace-tab geometry remains stable and focus remains visible.
- Given Home commands are shown, then Home remains the first destination and My Collection immediately second; category disclosure, collapse, Quick Access and keyboard navigation retain their current behavior.
- Given cards or pill controls elsewhere, when the selected-tab correction applies, then those unrelated shapes retain their intended appearance.

### US3 — See the reference dashboard compositions (P1)

As a user, I want the reference’s dashboard layout and component styling, not the current sparse/decorative presentation.

- Given Overview, then it contains the reference’s active-development-hours composition, workflow/command-pulse composition, ecosystem/star breakdown and repository explorer in the same responsive arrangement and visual hierarchy.
- Given Quality & Review, then the reference’s approvals, hygiene and security/guardrail compositions are represented with the same card and status treatment.
- Given Benchmarks & CI, then the reference’s module/service allocation, release-loop and workflow/latency compositions are represented with matching visual hierarchy.
- Given Cadence & Goals, then the reference’s sprint/release goals, weekly contributions and contributor-retention compositions are represented with matching visual hierarchy.
- Given a panel uses a metric unavailable from existing public repository data, then it visibly identifies that value as unavailable or its entire example panel as Demo; visual fidelity does not turn an example into claimed live telemetry.
- Given repository filtering, inspection, clone copying or export, when used in the new composition, then existing data scope, safety, feedback and outcomes are retained.

### US4 — Keep appearance choices and workflows (P1)

As an existing user, I want my saved choices and working data preserved when the default changes.

- Given a valid saved theme/style/font selection, when I reload after the change, then it is restored without being silently replaced by the new default.
- Given the existing appearance picker, when I select the new default or an older appearance, then the selected appearance applies, survives reload, and participates in existing backup/restore behavior.
- Given collection actions, profile changes, global search, tool drafts or backup/restore, when used after the visual change, then their navigation steps, confirmations, validation, save behavior and outcomes match their current behavior.
- Given keyboard-only, touch or reduced-motion use, then all existing actions remain reachable and understandable in both workspace layouts.

### Edge Cases

- Missing, obsolete or invalid saved appearance values: fall back to the new default without deleting unrelated saved preferences.
- Storage blocked: show a usable default; existing preference-save feedback still reflects failure accurately.
- Long usernames/repository names, zero/100 loaded repositories, large counts, missing metadata and request errors: layouts remain usable and scope/error labels remain visible.
- At narrow widths, adapt the reference’s column/section flow without document-level horizontal overflow; contained data-table scrolling is acceptable.
- Unavailable fonts/assets or offline entry: use a usable fallback without hiding controls or breaking navigation.
- Focus/hover/selected states must remain distinguishable, including the rectangular workspace-tab override in older appearances.
- Reference animations respect reduced motion and never obscure loading, errors, dialog focus or user actions.
- Demo approvals, CI, keycaps, goals or policy controls cannot imply or perform real GitHub changes. Preserve existing global shortcut ownership.
- New default styling must not reintroduce stale settings-restore previews or left-aligned wrapped mobile profile controls fixed in the dashboard feature.

## Requirements

### Functional Requirements

- **FR-001**: The new reference dark appearance MUST be the default for fresh sessions and invalid/missing appearance fallback; valid saved user choices MUST remain respected.
- **FR-002**: The existing appearance picker MUST expose the new default and its reference light presentation while keeping existing selectable appearances, persistence and backup compatibility.
- **FR-003**: Reference correspondence MUST cover layout, spacing, typography, colors, card/control geometry, border/shadow treatment, icons, chart styling, status indicators and responsive composition, not palette alone.
- **FR-004**: Workspace category tabs MUST have square corners in selected, hover and focus states across both workspace layouts and all selectable appearances; selected background/state feedback MUST remain intact.
- **FR-005**: Cards, inner panels, dialogs and non-workspace pill controls MUST retain their reference-appropriate individual shapes rather than inheriting the square-tab rule.
- **FR-006**: All four dashboard compositions described in US3 MUST be represented. Existing measured public-repository content MUST remain tied to the loaded developer and disclosed population; unavailable/demo content MUST remain explicit at its point of display.
- **FR-007**: No reference-only demonstration action MAY change remote repositories, account identity or collection data; no new telemetry integration or permission expansion is part of this appearance feature.
- **FR-008**: The new default MUST style the shared shell and shared controls across Home, My Collection, Discovery, settings and tools. It MUST remove the current default’s decorative dotted canvas, geometric ornaments, marker-style headings, heavy offset shadows and oversized dashboard heading where these diverge from the reference.
- **FR-009**: GistHub MUST retain one integrated shell/appearance/search/profile experience, Home first and My Collection second, existing routes and collection query defaults, and both current workspace layout options.
- **FR-010**: Existing actions, validation, confirmations, account isolation, stored data, drafts, copy/export behavior, settings restore and saved Quick Access membership/order MUST remain intact.
- **FR-011**: Layouts MUST support keyboard/touch input, visible focus, accessible chart descriptions, readable labels, reduced motion and usable 375px, 1074px and 1440px viewport widths without document overflow.
- **FR-012**: Visual review MUST compare the original reference and implementation at equal viewport size, state, zoom and data density, recording all intentional differences rather than claiming a literal match between different datasets or states.

### Key Entities

- **Reference Appearance**: The coordinated dark/light visual design from the newly supplied HTML, including typography, layout and component treatments.
- **User Appearance Selection**: Existing saved theme, style and font choices; separate from the default used when no valid choice exists.
- **Workspace Tab State**: Current category, selected fill, square-corner shape and keyboard/focus state; independent of card radius.
- **Dashboard Panel**: A region corresponding to a reference card/composition, containing measured, unavailable or explicitly labeled demo content.
- **Visual Comparison State**: Viewport, mode, active view, loaded population and interaction state used for repeatable reference comparisons.

## Success Criteria

- **SC-001**: All fresh/invalid-preference entry tests start in reference dark mode without a visible flash of the previous default, under both system light/dark preferences.
- **SC-002**: Visual review accounts for 100% of the reference regions listed in US3 across all four views at desktop and mobile sizes; every intentional difference is recorded and no unexplained layout/styling difference remains at acceptance.
- **SC-003**: Corresponding panels reproduce the reference’s 24px outer and 18px inner corner geometry, typography family/weight hierarchy, measured spacing and color values; review at equal state/size verifies these properties rather than substituting the old presentation.
- **SC-004**: Selected workspace tabs show zero corner rounding, retained selected fill and visible focus in both layouts, at all three specified widths and across all existing appearance choices.
- **SC-005**: Every tested valid saved appearance survives reload and backup/restore; all existing appearance options remain reachable and invalid preferences select the new default.
- **SC-006**: Existing dashboard, collection/profile isolation, copy/export, draft, settings-restore, Quick Access and keyboard workflow checks pass after the change.
- **SC-007**: Each dashboard view and the shared navigation remain usable at 375px, 1074px and 1440px without document-level horizontal overflow, with keyboard access and reduced-motion behavior verified.

## Assumptions and Dependencies

- Scope is GistHub web appearance and reference dashboard presentation; Flutter and deployment are excluded.
- “100% reference” means faithful visual correspondence for equivalent states, with only explicit exceptions: GistHub identity/existing workflows, rectangular workspace tabs, and honest measured/demo/unavailable labeling. Data-specific text/counts and extra existing commands naturally differ; they must not be disguised as styling mismatches.
- The reference initially opens dark; this is the new fresh-session default. Existing saved choices are not an authorization to overwrite user preferences. Selecting the new default manually remains available to existing users.
- The rectangular-tab instruction applies to workspace categories in both layouts and remains independent of whichever appearance is selected. It does not make all cards and controls rectangular.
- Existing telemetry remains a bounded public repository view. Reference-only developer hours, command pulses, approvals, CI histories and contribution/goal panels can use clearly labeled examples or unavailable values; genuine new data collection/auditing is outside scope.
- Source reference: C:/Users/Sann Lynn Htun/Downloads/gitpulse_universal_github_engineering_developer_telemetry.html. Preserve an identifiable baseline during planning so later changes to the downloaded file cannot silently redefine acceptance.
- Observed design baseline: dark canvas #0E0F12, cards #17181C, elevated surfaces #1E2025, primary text #F5F6F8, secondary text #8E939E, subtle translucent borders, indigo/violet accents, Plus Jakarta Sans interface text and JetBrains Mono data/keycap text; light canvas #F3F4F8 with white cards and slate text. Matching these is a design requirement; the implementation approach is deferred to planning.
- Existing project rules require the design decision and affected workflow checks to be recorded before implementation; this specification fulfills that prerequisite. No application changes are performed by this specify step.
- Reference baseline SHA-256: E459359A7D8947B8D78E7E5707810369E7C2B5364B06F3485038FB2B7239F52E.

## User correction — 2026-11-19

The menu-preview file is now authoritative (frozen as references/menu-preview.html). Require an exact rebuild and use its icons. Withdraw the broad shell exception; retain only explicit square tabs, honest data labels and necessary extra controls. Embedded logo bytes are authoritative over the black-backed attachment. This amendment supersedes older source/path statements; all behavior requirements remain.

## November 18 preview revision
Match the November 18 preview motion and repository city without changing current workflows.

The repository city uses the reference neon site plan and simulated five-stage deployment timeline. The preview connector adds no new workflow to GistHub.
