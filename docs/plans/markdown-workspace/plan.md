# Markdown live preview and tabbed workspace

Date: 2026-11-07
Branch inspected: codex/chrome-devtools-startup
Status: Implemented and validated on 2026-11-07. See validation.md for evidence.

## Setup and gates
The requested speckit-plan skill was read. This repository has no .specify directory, feature specification, constitution, plan template, setup-plan.ps1, or extension hooks. The prescribed setup command cannot run. These documents adapt its Phase 0/1 outputs without claiming a successful standard Spec Kit run or inventing a constitution. No branch was created or changed. This document records the feature requirements as the planning baseline.

## Requirements
1. Add a first-class Tools entry named Markdown Live Preview at /tools/markdown-live-preview, also listed on the Tools Guide.
2. Provide editable Markdown alongside an immediate rendered preview, opening a local Markdown file, browser-local draft recovery, copying source/HTML, and downloading Markdown/HTML. Expose existing DOCX and browser print/PDF workflows without silently losing the draft.
3. Support headings, lists, tables, links, fenced code and highlighting. Include math and Mermaid through existing renderers, with isolated rendering errors and safe fallbacks.
4. Replace desktop sidebar-led navigation with an Excel-inspired workspace: a compact title/quick-actions row, top tabs, and a contextual grouped command row. Preserve GistHub themes and app identity rather than copying Excel branding.
5. Retain all current routes, account actions, Tools discovery/search, global search shortcut, file blur, backup, updates, theme and sound controls. Keep narrow screens usable and keyboard navigation accessible.

## Technical context
Blazor WebAssembly on .NET 10; Razor components; Tailwind CSS; existing browser JS interop. Bundled marked, DOMPurify, highlight.js and KaTeX; Mermaid currently loaded from a CDN. No new dependency or backend is needed. Existing app state and gist storage remain unchanged. Scope is GistHub web app; Flutter shell benefits when it hosts this app, but its native navigation is outside this design.

## Scope and integration map
- GistHub/Pages/MarkdownLivePreview.razor (new): route, source, file input, status, preview and export commands.
- GistHub/wwwroot/js/markdownLivePreview.js (new only for page-specific rendering, recovery and exports); inspect/reuse gistPreview.js, markdownText.js, codeImage.js, appShell.js downloadBytes, and existing math/diagram routines before adding helpers.
- GistHub/Layout/MainLayout.razor: top workspace tabs, command groups, existing Tools dialog entry and all retained actions; preserve profile-load retry, modal inertness, focus trapping/restoration and cleanup.
- GistHub/Layout/NavMenu.razor: migrate its routes and account/sign-out UI into the new top navigation; remove duplicate desktop/mobile navigation only after every destination remains reachable.
- GistHub/Pages/Tools.razor: guide card for the new page.
- GistHub/wwwroot/css/app.css: responsive workspace and editor styles; regenerate output.css using the existing release command. Inspect other theme CSS for sidebar/topbar overrides before editing.
- GistHub/wwwroot/js/appShell.js: retain Tools filtering, category persistence and shortcuts; change only if tab keyboard handling needs it.
- scripts/test-tools-guide.mjs: update the fixed tool count (currently 13) and verify the new action. Add one focused browser validation script for editor, security, recovery and tabs using the existing harness.
- GistHub.RegressionTests/ProfileLoadingTests.cs and relevant shell/Tools/browser checks: preserve existing behavior; update fixtures/selectors only when the UI contract changes intentionally.
- No model, storage interface, public export, API, dependency, or runtime configuration change is planned. Check service-worker asset inclusion through the existing build rather than adding cache configuration preemptively.

## Workspace design
Top tabs: Home, Discover, Tools, View. Tabs select command panels without navigating or discarding page state. Home contains My Collection, New Snippet, Playlists and SLH Collection; Discover contains Discovery and Trending; Tools contains Open Tools, Tools Guide, AI Tools & Skills, and Markdown Live Preview; View contains theme, sound, file blur and local settings. Keep search, account, backup and updates in the compact quick-actions row. Reuse existing components and actions. Highlight the selected command tab separately from the current route. No workbook/document tab system is introduced.

Use semantic tabs with aria-selected, aria-controls, roving tabindex, Left/Right/Home/End keys and a labelled tabpanel. On mobile allow the tab strip to scroll within its container and wrap command groups. Avoid simultaneous old bottom navigation and new tabs. The editor becomes a vertical stack on narrow screens; offer Edit/Preview switching only if stacking proves unusable.

## Implementation order
1. Implement the standalone local Markdown workbench and focused checks; add Tools menu and guide entries.
2. Recompose navigation into title, tabs and contextual commands using current actions; migrate account UI and remove duplicates.
3. Rebuild CSS, run regression checks and browser scenarios, check all themes and narrow widths, and fix accessibility/focus regressions.

## Acceptance and risks
All requirements must pass the scenarios in quickstart.md. No cached gist/profile data may be migrated or deleted. Draft storage uses a distinct key. Autosave and imported files contain potentially sensitive source; never submit them to the reference site. Sanitize every rendered/exported HTML path and restrict Mermaid execution. Remote images can disclose network metadata; default to blocking remote preview media with an explicit opt-in if needed. Missing CDN assets must produce an actionable fallback. Storage failures must leave editing and downloads available with a visible warning.

The reference workflow is inspiration, not permission to embed the external site or clone every converter. Full parity, cloud sync, multiple documents, ribbon customization, drag-and-drop and synchronized scrolling are excluded. PDF means browser Print / Save as PDF, not a new conversion engine. No unjustified architecture additions were found; the formal constitution gate remains unavailable because the project has no constitution.
