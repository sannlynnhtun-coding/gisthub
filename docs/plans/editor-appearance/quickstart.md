# Quickstart validation guide (after implementation)

## Prerequisites
.NET 10 SDK, Node.js for existing assert-based scripts, and a local browser. Use a local/test profile; do not publish live GitHub data to validate defaults. See validation.md for the implementation test results.

From repository root:
```powershell
dotnet build GistHub/GistHub.csproj
dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj
dotnet run --project GistHub/GistHub.csproj
```
Run the focused Node checks:
```powershell
node scripts/test-editor-appearance.mjs
node scripts/test-app-updates.mjs
```
The existing scripts/test-local-settings.mjs exports a browser-harness check rather than a standalone Node test. See validation.md for checks actually completed.

## Acceptance scenarios
1. Fresh /editor: Secret and Bookmarked selected; both can be changed. Existing gist retains privacy/bookmark/name. Restored draft retains prior choices, name and toggle (older draft defaults toggle On).
2. Description: test paste and ordinary typing, selection replacement, undo, multiline and protected examples in contracts/ui-and-json.md. No rewriting on load, blur or save.
3. Filename: test On/Off, paste/blur/save, extension and compound suffix, Unicode/Burmese, dotfile, repeated separators, invalid/empty values and idempotence. Edit only description on a legacy mixed-case filename: no rename. Inspect fake GitHub create/update arguments to verify original-key rename and unchanged content.
4. Help toast and toggle: keyboard activation, announced status, dismissal, no accumulated listeners after navigation, 657x835 and narrower layouts.
5. Set theme/style/font and favorites in each category; copy JSON, change settings, paste/apply. Exact round-trip, reload persistence, correct picker labels/checks, and hover/Escape preserve imported committed settings. Copy during hover exports committed values.
6. Cancel paste; invalid JSON/version/types/unknown fields/catalog IDs/oversized payload: zero writes or visual changes. Simulate clipboard denial and unavailable API: manual copy/paste remains usable. Simulate storage/apply failure: rollback verified and failure feedback shown.
7. Confirm payload excludes Sound, nonappearance Local settings, profile/token/gist data. Confirm those settings and existing full local-settings backup/restore still behave unchanged, including backup reminder tracking.

Use focused assert checks for conversion and serializer/validation/rollback, existing .NET regression style for defaults/load/save/draft paths, and local browser checks for paste selection, keyboard, clipboard, picker lifecycle and mobile layout. No deployment or DB migration is part of validation.

