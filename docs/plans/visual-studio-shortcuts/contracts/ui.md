# UI contract

- Name: Visual Studio Shortcuts.
- Route: /tools/visual-studio-shortcuts.
- Ribbon ID: visual-studio-shortcuts, under Tools.
- Launch: existing OnOpenWorkbenchTool callback and trigger reference; workspace Pages maps the name to the new component and relative route.
- Discovery: Tools Guide entry and shared ToolHelpContent entry use the same exact name.
- Quick Access: inherits existing add/remove/launch behavior through the ribbon command catalog, with distinct Quick Access test IDs.
- Content: selectable action and shortcut text in 11 named categories, matching the original second attachment. No image-only content, new shortcut listeners or remote requests.
- Presentation: GistHub theme tokens, shared page shell and help conventions; direct route has a PageTitle, workspace uses its shared header/title. Headings and table header associations remain accessible at narrow widths and in both themes.
- Navigation: shared Back behavior and focus restoration, no new navigation stack or draft state.

No external API or storage contract changes.
