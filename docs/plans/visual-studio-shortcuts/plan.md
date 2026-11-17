# Visual Studio shortcuts page

Date: 2026-11-17
Branch inspected: main (unchanged)
Status: Implemented. Build, regression suite, Quick Access validation and workspace/browser checks passed on 2026-11-17. Content includes 108 rows across all 11 source categories; existing project styles are reused.

## Setup and gates

The requested speckit-plan skill was read. This repository has no rules.md or .specify directory, so setup-plan.ps1, the feature spec, constitution, template and extension hooks are unavailable. Standard Spec Kit setup and constitution checks cannot run. Follow the existing docs/plans convention; this document supplies the requirements baseline. No framework setup or application edits are part of this planning change.

## Requirements

- Add a real Visual Studio Shortcuts page at /tools/visual-studio-shortcuts, reachable from the Tools ribbon and Tools Guide through the existing workspace.
- Use the original second attachment for every shortcut and category. The generated poster is not authoritative: it can contain transcription errors.
- Include all 11 categories: Code editing, Search and replace, Refactoring, Navigation, Debugging, Multi caret and selection, Projects and solutions, File management, Windows and display, Git, Unit testing. Include Projects and solutions rows continued at the original image's upper right, and retain repeated entries in their respective categories.
- Match GistHub's current layout, typography, spacing, borders, cards, buttons and light/dark themes. Do not import the poster's purple banner, Microsoft branding, fixed print canvas or image styling.
- Render selectable text, category headings and semantic action/shortcut tables. Use existing theme tokens for key labels; display sequences, alternatives and mouse actions faithfully without introducing an ambiguous shortcut parser.
- Stack sections at narrow widths; allow shortcut text to wrap without page-level horizontal scrolling.
- State that these are Visual Studio for Windows shortcuts and bindings can vary by keyboard profile, version or extensions. Include Tools → Options → Environment → Keyboard as the configuration location.
- This is a reference page; it must not register or execute the displayed keyboard shortcuts.

## Technical context

Blazor WebAssembly, .NET 10, Razor components and existing Tailwind CSS. ToolWorkspace.Pages owns page-tool component/route metadata. MainLayout derives routed tools from that catalog and supplies workspace navigation/focus behavior. NavMenu owns the ribbon command catalog and rendering, including Quick Access. Tools.razor owns the guide's list. ToolHelpContent supplies shared help. No new package, backend, storage, JavaScript, configuration or Flutter change is needed.

## Scope and affected paths

| Path | Required change or verification |
| --- | --- |
| GistHub/Pages/VisualStudioShortcuts.razor | New routable reference page, local static category/row data, existing workspace cascading parameter and title conventions. |
| GistHub/Components/UI/ToolWorkspace.razor | Register component and route in Pages. |
| GistHub/Layout/NavMenu.razor | Add stable visual-studio-shortcuts command in Tools and matching renderer using current workspace callback, trigger refs, original/Quick Access test ID conventions. |
| GistHub/Pages/Tools.razor | Add Visual Studio Shortcuts to ToolsList. |
| GistHub/Services/ToolHelpContent.cs | Add concise purpose, example and help using the current entry shape. |
| GistHub/Layout/MainLayout.razor | Verify shared dispatch, direct route, Back and focus restoration; no new dispatch branch expected. |
| GistHub/wwwroot/css/app.css and output.css | Reuse current styles first; add only a narrowly scoped responsive rule if required. Regenerate output.css with existing CSS build if styles change. |
| GistHub.RegressionTests/Program.cs and focused new check | Register a small content/catalog check following existing regression patterns. |
| scripts/test-tool-workspaces.mjs and existing workspace/browser checks | Inspect selectors before editing; cover new launcher, routing, help, Quick Access and narrow/theme rendering. |

Inspect callers and current uncommitted changes before implementation. Many workspace/navigation files already contain unrelated work; preserve it. No existing data, credentials, APIs, exports or fixtures should change. Verify any tests that enumerate tools or command IDs; extend only those affected by the new entry.

## Minimal design and sequence

1. Transcribe the original second attachment into category-local immutable rows on the page. Independently compare each row with the source, especially punctuation, Ctrl+K chords, slash alternatives and arrow/mouse gestures. Do not normalize or silently correct source bindings.
2. Build the page using compact-tool-page, neo-kicker, tool-heading-inline, bg-card, border-border and text-muted-foreground conventions. Use section headings, table captions/column headers and readable wrapped key labels. Follow IsToolWorkspace/PageTitle/ToolHelp conventions.
3. Register the page in the workspace, ribbon, guide and help catalog. Reuse current command invocation and Quick Access; add no preference key or draft interface for a static page.
4. Add one focused content/catalog regression check and validate direct/workspace navigation, Back/focus, light/dark and narrow layouts. Run the existing build and appropriate workspace regression checks.

## Post-design gates

Scope: complete for a static shortcuts reference. Compatibility: existing routing and workspace callbacks remain authoritative. Data/security: static text only, no HTML injection or persisted state. Accessibility: semantic tables/headings, readable contrast, wrapping and existing navigation/focus behavior. Dependencies: none. Constitution: unavailable; no compliance claim. Extension hooks: no configuration exists before or after planning.

## Artifacts

research.md, data-model.md, contracts/ui.md and quickstart.md.
