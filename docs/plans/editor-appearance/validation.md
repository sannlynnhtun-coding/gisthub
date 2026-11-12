# Implementation validation

Date: 2026-11-12. Local implementation only; no deployment, live GitHub save, database migration or existing gist/draft rewrite.

## Completed
- Build with .NET SDK 10.0.302: passed, zero compiler warnings/errors. The host's default SDK 11 first failed due to missing browser-WASM runtime and a restore disk-space error. SDK 10 was selected with a temporary global.json outside the repository; project SDK/config was not changed.
- dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj: passed, including new filename/defaults/existing gist immutability/unchanged-name blur/legacy draft checks and all existing regression checks.
- node scripts/test-editor-appearance.mjs: passed. Covers Unicode and protected description tokens, filename logic through .NET checks, strict appearance schema/catalog/size checks, deduplication, rollback after storage/render failures, unchanged unrelated preferences and backup revision tracking.
- node scripts/test-app-updates.mjs: passed; existing draft recovery/update guards remain compatible.
- Local isolated Chromium module checks: description paste replaces only the selection, keeps bound input state synchronized and supports native undo; real theme/style/font apply functions round-trip appearance JSON and reject unknown fields without writes. Backup reminder detects appearance changes.
- Authenticated local Chromium UI checks: Secret/Bookmarked/kebab-On defaults; description selection paste; filename conversion on blur and exact preservation with toggle Off; help toast and dismiss; denied clipboard manual-copy fallback and textarea focus; appearance import updates Blazor selection state and survives panel close. Session draft storage stayed byte-for-byte unchanged. Test appearance settings were restored afterward; no publish/save action was invoked.
- git diff --check: passed.

## Behavior and implementation choices
Description changes only plain kebab tokens inside clipboard text; normal input is not rewritten. Filename normalizes on paste, blur after an edit, explicit toggle On and save after an edit; unedited loaded/restored filenames are left alone. AutoDismissMessage provides existing ten-second feedback behavior. Paste style opens a labelled manual JSON entry field instead of requesting clipboard-read permission. Copy failure exposes the JSON for manual copying. No general toast service, new dependency or DB change was introduced.

## Limits
No live GitHub create/update was performed. No cross-browser/mobile visual sign-off is claimed; Chromium checks cover the actual editor/picker controls and .NET tests cover editor load/default/draft semantics. Browsers without insertText editing-command support use the documented paste fallback, which may not preserve native undo. Unknown/stale appearance catalog IDs reject the import rather than silently substituting settings. Rebuilding the app after regression tests and reloading the browser without cache resolved stale local fingerprinted-asset 404s during validation. Rebuild CSS emitted pre-existing Browserslist/content-glob maintenance notices.
