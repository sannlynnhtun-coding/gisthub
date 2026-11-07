# UI contracts

## Tools integration
Menu entry: Markdown Live Preview; route: /tools/markdown-live-preview; category: Markdown & documents. Suggested stable selector: data-testid="markdown-live-preview-menu-item". Guide uses the same name and route. Both close the Tools dialog on navigation.

## Editor
Labelled Markdown source textarea and rendered preview region; status announcements use role=status, errors use role=alert. File import accepts .md/.markdown/.txt, maximum 1 MB UTF-8. Typed and restored source use the same bound. Copy Markdown/HTML and download .md/.html act on the current source revision. Exported HTML is sanitized, without executable scripts or event handlers. Print hides editor/chrome and prints only the preview. Clear is explicit and must persist an empty draft. Failed imports or renders must not erase source.

Unsafe raw HTML, javascript links, active SVG and Mermaid click/script features must not execute. External links use noopener/noreferrer. Remote media is blocked by default. Render failure shows readable source/error and leaves download available. Disabling checkbox inputs is mandatory when rendering task lists.

## Workspace
Tabs: Home, Discover, Tools, View, each controlling one contextual panel. Keyboard behavior follows the tab pattern; visible focus must survive theme changes. Navigation links retain normal href routing semantics and direct deep links. Existing Escape dismissal, focus return, inert background, Ctrl+K, sign-out confirmation and profile loading retry remain functional. Command tab changes do not reset source or change the URL. No public API is added.
