# Research decisions

Sources: Editor.razor, ThemeToggle.razor, theme.js, localSettings.js, fonts.js, regression runner, and existing docs/plans/markdown-workspace. Local code inspection (implementation also found the reusable AutoDismissMessage component); no new technology choice requires web research.

- Decision: adapt Phase 0/1 under docs/plans. Rationale: .specify infrastructure is absent and an existing plan uses this approach. Alternative: bootstrap Spec Kit and invent a constitution; unnecessary scope.
- Decision: description changes only the clipboard fragment during paste. Rationale: preserves deliberate typing, stored data and surrounding content. Alternative: normalize on every input/save; contradicts confirmed requirement.
- Decision: filename changes at paste/blur/save after an explicit edit; keep On by default and preserve extensions/Unicode. Rationale: avoids caret jumps and accidental rename when editing description alone. Alternative: unconditional normalization of loaded filenames; risks renaming existing files.
- Decision: reuse existing create/update and bookmark metadata paths. Rationale: new defaults need no model/schema changes. Alternative: migration/backfill; would change existing user data.
- Decision: appearance-only versioned JSON plus manual JSON entry. Rationale: full localSettings backup contains gist/group and unrelated preferences; clipboard reads can fail. Alternative: invoke restoreBackup; violates scope.
- Decision: include favorites because they are durable controls inside the Appearance panel; derive presets from theme/style. Rationale: round-trip all panel-owned durable settings without conflicting values. Exclude transient panel navigation/filter state.
- Decision: validate catalog IDs, payload shape and size before writes, with rollback on commit failure. Rationale: existing apply functions may silently substitute defaults and multi-key storage may fail midway. Alternative: validate identifier syntax only or apply incrementally; loses faithful round-trip and risks partial state.
- Decision: reuse AutoDismissMessage with local accessible status feedback. Rationale: requested help/success feedback does not justify a new app-wide notification subsystem.

No unresolved requirement blocks this proposed design. Detailed token protection and import policy are specified in the UI contract as reviewable implementation choices.
