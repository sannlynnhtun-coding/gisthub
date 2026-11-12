# Editor defaults, text conversion and appearance sharing

Date: 2026-11-12
Branch inspected: main (no branch change)
Status: Implemented locally after user authorization; see validation.md. No database/schema changes.

## Setup and gates
The speckit-plan skill was read. This repository has no .specify directory, setup-plan.ps1, feature spec, constitution, template or extension hooks. The standard setup and constitution gates cannot run. These Phase 0/1 documents follow the existing docs/plans/markdown-workspace precedent; they do not claim a completed standard Spec Kit workflow. This plan is the requirements baseline. No framework bootstrap is needed for this feature.

## Confirmed requirements
- Description: convert kebab text to normal text on paste only; never normalize ordinary typing, loaded data or saves.
- Filename: kebab conversion toggle defaults On; provide a labelled information button that explains behavior in a toast.
- New gists default to Secret and Bookmarked. Existing gists and recovered drafts preserve stored choices.
- Appearance panel gets Copy style / Paste style buttons, sharing all durable appearance settings only. Exclude Sound, other Local settings, account data, gist data and credentials.

## Technical context
Blazor WebAssembly, .NET 10, Razor and existing browser JavaScript interop. Editor has create/update paths, Markdown filename detection, GitHub rename semantics, local bookmark ordering and update draft recovery. ThemeToggle delegates live preview/commit/cancel to theme.js, interface-styles.js and fonts.js. localSettings.js already validates appearance favorites and provides broader backup operations. Reuse relevant helpers without calling the broader restore workflow. No dependencies, API changes, schema migration or database access are required for planning.

## Scope and affected paths
- GistHub/Pages/Editor.razor: description paste binding and cleanup, filename toggle/conversion/help, defaults, draft capture/restore, save and rename behavior. Inspect all bindings and lifecycle callers before implementing.
- GistHub/wwwroot/js/: smallest editor paste helper needed to read clipboard text, respect selections and synchronize Blazor; use existing module/lifecycle conventions. Keep conversion rules testable without a browser.
- GistHub/Components/UI/ThemeToggle.razor and GistHub/wwwroot/js/theme.js: grouped actions, JSON entry fallback, committed values, preview cancellation, refresh picker state and favorites.
- GistHub/wwwroot/js/localSettings.js: reuse favorites validation and preference backup tracking where appropriate; keep full backup contract unchanged.
- GistHub/wwwroot/js/interface-styles.js and fonts.js: reuse catalog validation and apply functions; avoid edits unless required by atomic application.
- Existing app stylesheet: only button group, small toast and JSON entry layout if existing styles do not suffice. Reuse AutoDismissMessage for timed feedback; no app-wide toast framework.
- GistHub.RegressionTests/Program.cs and relevant visibility/editor tests; scripts/test-local-settings.mjs browser harness patterns. Add focused conversion/appearance checks rather than rewriting unrelated tests.
- No public service interface, model persistence schema, config, exports, fixtures or dependencies should change. Verify this assumption during implementation; update only actually affected selectors/fixtures.

## Proposed interaction details
Description conversion operates only on the pasted fragment: replace single hyphens between Unicode letter/number segments with spaces in plain kebab tokens. Preserve case, surrounding text, line breaks and selection semantics. Protect URLs, emails, hashtags, paths, filenames, negative numbers and repeated-hyphen text; mixed prose retains punctuation. No title-case guessing. Test the protection rules explicitly.

Filename conversion occurs on paste and blur, and once before save while On, avoiding caret jumps while typing. Preserve Unicode letters/numbers and dot-separated suffixes (including .tar.gz); lowercase invariantly, turn whitespace/underscores into hyphens and collapse repeated hyphens. Preserve leading dots and dots inside names; do not strip unsupported characters silently. Reject path separators/control characters and invalid/empty names through existing save feedback. Turning On normalizes the current manually edited name; turning Off preserves current text without reconstructing an earlier value. Loading an existing gist/draft never renames it automatically: normalize only after a filename edit or explicit Off-to-On action. Toggle is editor-local, default On on a fresh editor; capture it in the existing update draft with backward-compatible default true for older drafts.

Information toast example: “Kebab case turns My Useful Snippet.cs into my-useful-snippet.cs. Extensions are kept. Turn it off to keep your filename.” Use keyboard-accessible labelled buttons, an aria-live status, a dismiss action and bounded dismissal timer; clear timers/listeners on disposal.

Copy exports committed appearance, never temporary hover previews. Include theme, interface style, font and favorites for themes/styles/presets/fonts; presets are derived style/theme combinations, not a second conflicting selection. Exclude transient search, active category, hover and Favorites only filter. Paste opens a labelled JSON textbox with Apply/Cancel; clipboard read may prefill it, but denial still permits manual paste. Validate the whole payload before any write; apply all settings and favorites together or restore previous persisted and rendered values on failure. Refresh component fields, datasets and selected/favorite markers so closing the panel cannot undo the import. Report success only after commit. Existing backup reminder tracking must still detect changes.

## Implementation sequence
1. Add small conversion functions and focused edge-case checks; integrate paste-only description handling and filename rules with existing save/rename/draft paths.
2. Change only new-gist defaults; verify old drafts and edits still win over defaults.
3. Add versioned appearance serializer/validator and atomic import using current catalogs/apply functions; add Copy/Paste group and accessible feedback/manual-paste fallback.
4. Run focused checks, regression runner and build; verify narrow-screen editor, keyboard flow and persistence in a local browser. Do not publish test gists or deploy.

## Design gates after planning
Scope: pass; only requested behavior plus required validation/recovery.
Data/security: design requires no migration, no credentials in JSON and no partial import.
Compatibility: existing GitHub create/update interfaces and local-settings backup format remain unchanged.
Accessibility: labelled toggle/help/actions, focus return and announced feedback required.
Constitution: unavailable, not fabricated. Standard Spec Kit execution remains unavailable until project infrastructure exists.

## Artifacts
research.md; data-model.md; contracts/ui-and-json.md; quickstart.md.

