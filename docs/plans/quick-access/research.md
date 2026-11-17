# Research: Quick Access

All design unknowns are resolved by repository inspection and the explicit assumptions in plan.md. No external technology selection is required.

## Ribbon and command reuse

Decision: extend NavMenu and reuse its command actions, components and MainLayout callback contract.
Rationale: NavMenu already owns eight category tabs; MainLayout dispatches overlays and retained page workspaces. ToolWorkspace.Pages supplies page metadata but does not describe navigation, overlays, appearance or sound, so it cannot alone be the full command catalog.
Alternatives considered: route every shortcut directly (breaks workspace behavior); duplicate all command markup (risks drift); introduce an application-wide command framework (unnecessary scope).

## Persistence

Decision: store ordered stable IDs in one browser preference and include it in the existing validated local-settings backup flow.
Rationale: localSettings.js has an explicit key allowlist and assumes most remaining values are booleans; adding a key alone would fail import. Add a dedicated array validator before that boolean branch. backupState.js already exposes setPreference and reminder tracking.
Alternatives considered: IndexedDB/profile migration or GitHub storage (unneeded); raw localStorage writes (bypass backup tracking); omitting backup integration (loses a user preference during restore).

## Reordering and accessibility

Decision: native handle drag events for desktop, explicit earlier/later actions for keyboard and touch. One shared reorder operation.
Rationale: MyGists.razor already uses native Blazor drag start/end/enter/drop handlers and preventDefault on dragover; reuse that event pattern without changing bookmark ordering. No dependency is required; the fallback makes ordering usable without drag support. Existing appShell tab navigation derives its list from DOM and can accommodate a ninth tab.
Alternatives considered: touch drag library (extra dependency); drag-only controls (inaccessible); rearranging every category and tab (outside assumed scope).

## Compatibility risks

Decision: preserve IsVercelApp availability checks, launcher ElementReferences, original test IDs and Home/End behavior.
Rationale: MainLayout restores focus using the original trigger with a Tools-tab fallback. scripts/check-browser-errors.mjs hardcodes eight tabs; test-markdown-live.mjs expects Home and View as first and last tabs. Add Quick Access after Home to preserve those endpoints. Hidden YouTube Downloader must remain hidden when pinned on Vercel.
Alternatives considered: make Quick Access first/default (changes existing navigation); activate tool routes directly (changes retained drafts and Back behavior).
