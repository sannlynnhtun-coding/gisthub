# Quick Access toolbar

Date: 2026-11-17
Branch inspected: main (no branch change)
Status: Implemented locally; see validation.md for checks and limitations.

## Setup and gates

The requested speckit-plan skill was read. Neither rules.md nor .specify exists in this repository. There is no setup-plan.ps1, feature spec, constitution, plan template or extension hook configuration. Standard Spec Kit setup and constitution checks cannot run. Follow the existing docs/plans convention without bootstrapping a framework or claiming standard workflow completion. This document supplies the requirements baseline for the design.

## Requirements and assumptions

- Add a Quick Access tab after Home, leaving Home as the initial selection and keeping current collapse behavior.
- Each existing ribbon command offers an adjacent Add to Quick Access action. Adding appends once; an already-added command exposes Remove from Quick Access. The original command stays available in its original tab.
- Quick Access starts empty with instructions for adding commands from other tabs. Its items invoke the same navigation, tool workspace, appearance or sound action as their originals.
- Drag a Quick Access item by its handle onto another item to move it immediately before that target. Provide Move earlier / Move later buttons for keyboard and touch users, plus Remove. Persist membership and order across reloads in this browser.
- Interpret “switching order menu” as reordering commands inside Quick Access. Reordering the category tabs or original category menus is outside this plan.
- Preferences apply to this browser across profiles, matching existing appearance and sound preferences. No GitHub sync or Flutter changes.

## Technical context

Blazor WebAssembly targeting .NET 10; Razor UI, existing JS interop and Tailwind stylesheet build. NavMenu.razor owns tabs and commands. MainLayout.razor receives OnOpenWorkbenchTool with a launcher ElementReference and owns workspace/overlay routing and focus return. ToolWorkspace.Pages already catalogs page tools; overlay commands and navigation links are separately represented. ThemeToggle and SoundToggle are reusable components. appShell.js already handles tab keyboard navigation by querying rendered tabs. localSettings.js validates browser preference backups; backupState.js tracks preference writes. No new dependency, network endpoint, IndexedDB schema or storage service interface is needed.

## Scope and affected paths

| Path | Change or verification |
| --- | --- |
| GistHub/Layout/NavMenu.razor | Add tab, small shared command definitions/rendering, add/remove controls, ordered list, drag state, persistence lifecycle and feedback. Preserve icons, labels, original test IDs and tool help. |
| GistHub/Layout/MainLayout.razor | Verify all callback callers, tool dispatch, retained drafts and focus return with Quick Access launchers; edit only if integration requires it. |
| GistHub/Components/UI/ToolWorkspace.razor | Reuse page tool metadata; verify no duplicate sessions or dispatch changes. |
| GistHub/Components/UI/ThemeToggle.razor and SoundToggle.razor | Reuse controls in Quick Access; verify current state on mounting and unique popover IDs. |
| GistHub/wwwroot/js/localSettings.js | Add narrowly validated ordered command IDs to existing preference export/import. Old backups missing this key remain supported. |
| GistHub/wwwroot/js/backupState.js | Reuse setPreference; verify dirty/reminder tracking without changing unrelated preferences. |
| GistHub/wwwroot/js/appShell.js | Verify tab keyboard navigation and focus fallback; add drag interop only if required by native browser events. |
| GistHub/wwwroot/css/app.css | Minimal handle, action, drop-target and narrow-screen styling; regenerate output.css with existing build. |
| scripts/check-browser-errors.mjs | Update eight-tab assertion, register focused Quick Access browser checks. |
| scripts/test-tool-workspaces.mjs and test-markdown-live.mjs | Preserve routing, focus return and Home/End navigation assumptions. |
| scripts/test-local-settings.mjs and focused new Quick Access checks | Cover persistence, malformed input, backup round trip, interactions and accessibility. |

Inspect every caller before changing shared functions. No public exports, configuration or fixtures require changes beyond registering the focused checks; verify existing selectors during implementation.

## Minimal design

Use stable command IDs and one authoritative definition for each command's label, icon, availability and existing action. Keep this local to the ribbon; reuse ToolWorkspace.Pages where practical without building a second routing system. Extract only enough existing markup to render original commands and their Quick Access copies consistently. Keep existing test IDs on original launchers and use distinct Quick Access identifiers.

Use a JSON string array at gisthub:quick-access. Read once after initial render; persist through gistHubBackup.setPreference. Validate IDs against the known catalog, deduplicate in first-seen order, and reject malformed or oversized imports before writes. Unknown IDs in existing browser storage are ignored. Temporarily unavailable known commands remain stored but hidden, including YouTube Downloader on Vercel; membership editing must not discard hidden entries. On storage failure retain the last saved order and report failure; never claim persistence succeeded.

Keep drag operations inside the Quick Access list. Accept only an in-memory source ID from a started handle drag, ignore external drops, and clear drag state on end/cancel/tab change. Commit one order change on drop; invalid targets and self-drops do nothing. Use the same reorder operation for Move earlier / Move later. Reordering must not activate the item. Key rendered items by stable ID and return focus to a surviving control after removal. Announce changes through a small live status region.

## Implementation sequence

1. Inventory all current command actions, refs, availability guards, help and test selectors; establish stable IDs and the smallest shared rendering needed.
2. Add the Quick Access tab and membership controls, reuse existing command execution, and integrate validated preference load/save and backup handling.
3. Add handle-based drag reordering, earlier/later fallback and removal; verify focus, status feedback and narrow layouts.
4. Add focused state/validation and browser checks, update the tab-count assertion, then run build and existing regression/browser checks.

## Post-design gates

Scope: pass under the stated interpretation. Data: only command IDs persist; no gist, profile or credential data changes. Compatibility: existing destinations, workspace callbacks and availability guards remain authoritative. Accessibility: keyboard and touch alternatives, labelled controls, stable focus and status announcements required. Dependencies: none added. Constitution: unavailable; no compliance claim. No extension hooks exist to dispatch.

## Artifacts

research.md, data-model.md, contracts/ui-and-preferences.md and quickstart.md.
