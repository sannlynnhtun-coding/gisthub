# Compact converter design and specification

Use a neutral application surface, subtle borders, blue selection accents, and a compact single-line header. Replace the left settings column with a wrapping top toolbar, leaving preview and source as the two main panes. Stack panes on narrow screens. Reuse all existing settings, theme presets, and export actions.

New sessions select Simple. Existing saved theme choices remain intact. Empty or whitespace-only title and author fields omit their respective output elements without fallback labels. Hide content counts by default; expose a Show word / line count toggle for preview and every export. Keep existing draft tuple compatible; save the new preference separately through ToolDraftStore.

Affected surfaces: CodeImageOverlay, isolated styles, codeImage.js canvas/Markdown/PDF rendering. Preserve mode switching, separate source drafts, import validation, syntax/math/diagram rendering, copy settings/image, image formats/quality, PDF and Escape dismissal. Checks: application build, JS syntax, existing converter browser checks where available, and review matching metadata conditions across preview and exports.
