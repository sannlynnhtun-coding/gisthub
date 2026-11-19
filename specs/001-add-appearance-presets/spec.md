# Feature Specification: Four Global Appearance Presets

**Created**: 2026-11-17
**Status**: Ready for planning
**Input**: Add BoardUI, Bencho, beUI Pro, and ObsidianUI appearances throughout the project. Redesign is allowed; workflows must remain unchanged. Decide and specify before implementation.

## Decision

Add four coordinated choices to the existing Presets category: BoardUI, Bencho, beUI Pro, and ObsidianUI. Each applies theme, style, and font together, including related spacing, borders, corner shapes, shadows, and interaction feedback. Reuse existing appearance controls and preserve existing workflows.

Apply across web and Flutter within their existing feature sets. Match reference typography, surfaces, controls, and motion closely while preserving workflows. Rendered inspection and visual definitions are recorded in plan.md. Pixel identity with different content/layout is not asserted.

## User Scenarios & Testing

### User Story 1 - Choose a complete appearance (Priority: P1)

As a user, I can select each of the four appearances from the existing chooser and see a consistent interface.

**Independent test**: Select each preset and visit existing pages and dialogs on each client.

**Acceptance scenarios**:
1. Opening Presets shows all four named choices alongside existing choices; existing search can find them.
2. Committing a preset applies its theme, style, and font together to navigation, pages, cards, forms, buttons, tables, menus, dialogs, notifications, and editor chrome.
3. Reloading or restarting restores the complete committed appearance.

### User Story 2 - Keep appearance controls (Priority: P1)

As a user, I can keep using existing preview, cancel, individual customization, favorites, sharing, backup/restore, and reset controls wherever supported today.

**Independent test**: Exercise existing appearance actions with old selections and each new preset.

**Acceptance scenarios**:
1. Previewing and canceling restores the previously committed theme, style, and font together.
2. Changing a preset's font, style, or theme remains supported; a modified selection is not falsely labeled an exact preset match.
3. Existing supported imports and backups remain restorable without losing unrelated data.
4. Favorites retain their existing meaning; Restore default restores the complete original default appearance.

### User Story 3 - Preserve daily tasks (Priority: P1)

As a user, I can perform existing tasks in the same sequence after a redesign.

**Independent test**: Repeat guest discovery, profile login/switching, gist create/edit/delete/sync, bookmarks/collections, tools, and backup/restore before and after applying each preset, wherever supported on that client.

**Acceptance scenarios**:
1. Routes, action availability, validation, confirmations, save triggers, and outcomes remain unchanged.
2. Switching appearance preserves open drafts, gist contents, account isolation, library metadata, and unrelated preferences.
3. User content formatting and independently selected export/output appearance settings remain unchanged.

### Edge Cases

- Missing fonts or offline use retain readable fallback text, including Burmese; code retains a suitable monospaced font.
- Unknown saved identifiers follow existing safe fallback behavior without deleting unrelated settings.
- Failed persistence/import retains existing error handling and does not leave a partially committed appearance.
- Rapid switching and cancellation restore the last committed complete selection.
- Narrow screens, long labels, keyboard navigation, visible focus, and reduced-motion preferences remain usable.
- Existing light/dark controls remain usable; planning defines their interaction with each preset.

## Requirements

### Functional Requirements

- **FR-001**: Add exactly four named presets without removing existing choices.
- **FR-002**: Each preset coordinates theme, style, font, spacing, borders, corner shapes, shadows, and appropriate interaction feedback in one selection.
- **FR-003**: Apply the selected presentation across all application-owned surfaces on web and Flutter, preserving each client's existing feature availability.
- **FR-004**: Preserve existing preview, commit, cancel, navigation, task steps, validation, confirmations, and save behavior.
- **FR-005**: Restore complete committed appearances after reload/restart and preserve existing supported appearance data compatibility.
- **FR-006**: Preserve individual appearance controls, favorites, sharing, backup/restore, and resets wherever currently available.
- **FR-007**: Preserve drafts, contents, account isolation, metadata, unrelated preferences, and independently chosen output formatting.
- **FR-008**: Preserve keyboard operability, visible focus, readable text including Burmese, reduced-motion support, and responsive layouts.
- **FR-009**: Before implementation, planning must record each preset's visual definition, fonts/fallbacks, light/dark behavior, surface coverage matrix, and workflow-preservation checks.

### Key Entities

- **Appearance preset**: Stable named combination of theme, interface style, font, and coordinated presentation.
- **Committed appearance**: Saved complete selection, separate from temporary previews and later individual customization.
- **Surface coverage matrix**: Existing pages and controls reviewed for consistent appearance and unchanged workflows.

## Success Criteria

- **SC-001**: All four presets are discoverable and selectable in the existing chooser on both clients.
- **SC-002**: Every applicable surface category listed in Story 1 passes visual coverage review for all four presets on both clients.
- **SC-003**: Reload/restart, preview cancellation, and Restore default pass for every preset.
- **SC-004**: All representative workflows in Story 3 retain their action sequence and outcome for every preset.
- **SC-005**: Each preset passes keyboard/focus, Burmese readability, reduced-motion, and narrow-screen checks without obscured essential controls.
- **SC-006**: Existing supported appearance imports/backups remain restorable, with zero lost drafts or modified gist content during acceptance checks.

## Assumptions and Dependencies

- References: [BoardUI](https://www.boardui.com/), [Bencho](https://bencho.dev/), [beUI Pro](https://pro.beui.dev/), and [ObsidianUI](https://www.obsidianui.dev/).
- Initial review identified a dashboard design system, an interaction library, animated web/mobile blocks, and an interactive component library respectively. Rendered visual inspection is a planning dependency.
- Reference names describe inspiration; exact website duplication is not required. Use appropriately licensed fonts/assets; purchasing commercial source or adding vendor libraries is outside scope.
- No new screens, tool capabilities, remote synchronization, or client feature parity are included.
- RULES.md governs redesign and workflow preservation. This specification records the decision; it does not implement the appearances.

