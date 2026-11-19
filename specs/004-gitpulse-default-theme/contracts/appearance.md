# Appearance and Interaction Contract

## Defaults, persistence and picker

Fresh boot and invalid/missing preference fallback: theme gitpulse-dark, style gitpulse, font plus-jakarta-sans. Existing valid saved axes are independently authoritative, including original light/dark, style default and font default. Preserve the historical obsolete auto-theme exception explicitly; do not infer consent to replace every stored legacy theme.

Existing preference keys/schema, favorites, appearance sharing validation against catalogs, import/export limits and preview/cancel semantics remain. Restore default selects the full new dark preset; Reset style selects gitpulse only. Selecting light mode uses gitpulse-light in the same catalog. Original appearances retain the same IDs/values and remain selectable. Workspace layout defaults/options do not change.

## Navigation shape

Every `.workspace-tabs > button` has all four corners 0px in selected, expanded, hover and focus states, regardless of appearance/layout. Retain existing selected fill, expanded-state fill, visible focus, category IDs/order and disclosure/tab semantics. Do not zero global component/portal radius or restyle all buttons to satisfy this contract.

Root remains Home. Home/My Collection command order and existing favorites destination, brand navigation, Discovery and all other routes stay unchanged. The reference's single-page identity/profile controls do not become a second account system. Existing global search owns its shortcuts.

## Reference scope and legitimate differences

Source: references/gitpulse-reference.html with the hash in spec.md. Default palette/geometry/fonts are measured against this file, including different treatment for cards, inner cards, pills, keycaps and dialogs. Scope GitPulse visual rules to its style; square workspace tabs are the expressly global exception.

Corresponding Home regions use equal controlled data/mode/viewport/font-load state for comparison. GistHub brand, shell layout/extra existing commands, the square-tab override and truthful demo/unavailable labels are explicit differences. They must be annotated in review evidence, not used to excuse unexplained spacing, chart, font or composition discrepancies. Data-specific labels/counts can differ in normal live use; pixel comparison uses matched fixtures.

## Panel behavior and trust boundaries

Measured panels use the existing public result and loaded population. Reference-only hours, command counts, approvals, CI/latency, contributions and goals are explicitly Demo or Unavailable. Demo UI never authorizes policies, merges PRs, starts CI or changes remote data; optional examples mutate only local view state. Do not install global keylogging, new analytics or background polling.

Keep existing safe text rendering/link validation, username validation, latest-load/profile/disposal protection, disclosure of partial 100-repository scope, measured-only CSV, truthful copy/download failure feedback, native dialog focus containment/Escape/restore, account isolation and settings-restore consumed-draft behavior. No new external request contract or permission is introduced.

## Accessibility and visual verification

Normal/reference control colors and geometry must match their reference values; correct a concrete accessibility conflict if discovered and record it as an explicit reviewed exception rather than silently shipping unreadable/focusless UI. All charts have accessible names and a text/table equivalent. Motion respects reduced preference. Check selected/hover/focus geometry with actual computed styles. Verify fresh first frame and restored state in both system preference modes, not just after clicking the picker.

## Rebuild override

Latest source is references/menu-preview.html. The earlier shell exception is withdrawn: default Excel must match its hierarchy. Additional controls remain but are positioned deliberately. Brand must use the embedded PNG; the supplied attachment is the same intended image. Symbol paths and dashboard Lucide icons are copied exactly. No mock action is transplanted.
