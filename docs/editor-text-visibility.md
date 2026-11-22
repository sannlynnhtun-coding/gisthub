# Editor text visibility fix

The editor toolbar currently overlays the editable content; padding utilities can place the first lines underneath it. Use a vertical flex layout with the toolbar and status in normal flow and a shrinking, independently scrollable content region. Apply equal block padding to the content at desktop and mobile sizes.

Affected surfaces: create/edit textarea and Markdown preview. Keep content binding, preview toggling, saving, drafts, navigation, and appearance selection unchanged. Verify the project build and existing editor regression checks; inspect layout rules for toolbar/content separation and scrolling.

Active border refinement: focus anywhere in the editor panel highlights its complete outer border using the current appearance ring color. Suppress the textarea's inner focus ring so the toolbar and status remain inside one clear focus boundary. Keyboard focus remains visible on the outer panel; content and save behavior are unchanged.
