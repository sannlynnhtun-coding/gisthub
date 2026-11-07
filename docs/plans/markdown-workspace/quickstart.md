# Validation quickstart

Prerequisites: .NET 10 SDK, Node/npm, existing dependencies installed in GistHub, and Chrome/browser harness configured as used by scripts/test-tools-guide.mjs. Run commands from repository root unless noted.

1. Build CSS from GistHub: npm run release:css.
2. Build app: dotnet build GistHub/GistHub.csproj.
3. Run regressions: dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj.
4. Start app: dotnet run --project GistHub/GistHub.csproj. Use the URL printed by the host. Follow existing browser harness setup and run node scripts/test-tools-guide.mjs against that instance.
5. Run the focused editor/workspace check using the existing harness (PowerShell):

   $env:BROWSER_CHECK_MARKDOWN_LIVE="1"
   node scripts/check-browser-errors.mjs http://localhost:5398/tools/markdown-live-preview

   For the Tools Guide, use BROWSER_CHECK_TOOLS_GUIDE="1" against /tools in a separate shell. Use the actual server URL if different.

## Required scenarios
- Open Tools, search for Markdown Live Preview, open it, then repeat from Tools Guide and a direct route. No duplicate entries or broken old tool actions.
- Type headings, table, list, task checkbox and fenced code; preview updates to latest source. Verify math and Mermaid or an actionable missing-renderer fallback. Rapid edits/navigation cannot apply stale rendering.
- Import a valid file, export Markdown, compare exact source including Unicode; copy/export HTML and reopen it. Reject oversized input and failed reads without replacing the draft.
- Refresh and recover source/filename; clear, refresh and verify empty source stays empty. Simulate storage quota/denied access and corrupt records; editing/download remain usable and warning is visible.
- Try script tags, event attributes, javascript links, active SVG and Mermaid click directives. Nothing executes. No document source is sent to the reference website; remote media remains blocked by default.
- Print preview: hide shell and source editor, preserve readable document. Check DOCX integration receives current source or clearly opens a separate converter while retaining the draft.
- Traverse all four command tabs with keyboard and pointer. Tabs change panels, retain URL and source, and expose correct ARIA state. Exercise every old sidebar destination plus account login/sign-out, settings, search, blur, backup, updates, theme and sound.
- Verify Tools and utility dialogs preserve inert background, Escape and focus restoration; Ctrl+K works. Profile load failure still offers Retry without clearing cached data.
- At 390px and desktop widths check no document-level horizontal overflow; tab scrolling stays inside its container, commands are reachable, and source/preview remain readable. Check light/dark and existing design styles.

See validation.md for completed automated and visual checks. Broader manual scenarios above remain a useful release checklist; they are not all claimed as tested.
