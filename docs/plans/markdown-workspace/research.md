# Research

Reference inspected: https://markdownlivepreview.dev/ on 2026-11-07. It describes split source/live preview, file opening, browser autosave, Markdown download, formatting, math/diagrams and conversion tools. Use the editor workflow and integrate existing GistHub exports; do not reproduce its full tool suite.

## Local implementation
Decision: native Razor page with browser interop, not an iframe.
Rationale: keeps drafts local and reuses the current app lifecycle, themes and Tools entry patterns.
Alternatives: external link/iframe would send users outside their workspace and would not integrate local drafts or exports.

## Rendering
Decision: reuse bundled marked, DOMPurify and highlighting; inspect existing math/Mermaid implementations before composing optional enhancements.
Rationale: gistPreview.js already sanitizes Markdown and highlights code; markdownText.js has a stricter fragment conversion and 1 MB UTF-8 guard. gistPreview.js currently removes input elements, so disabled task checkboxes need a page-specific safe policy rather than weakening shared gist rendering.
Alternatives: new editor/rendering libraries are unnecessary. Raw MarkupString from unsanitized source is unacceptable.

## Navigation
Decision: four real command tabs over the existing routed content, using existing action components.
Rationale: matches a spreadsheet workspace while avoiding a new routing or document system. Existing sidebar and mobile links must all be mapped before removal.
Alternatives: route links merely styled as tabs would not provide the requested contextual toolbar; a customizable ribbon adds unrequested scope.

## Recovery and exports
Decision: one versioned local draft key with bounded UTF-8 input, guarded storage access and existing download utilities. Pass a source snapshot explicitly to DOCX integration before routing; if unavailable, retain the draft and label the existing converter link as a separate tool.
Rationale: prevents exports from resetting or silently losing source. Browser print uses a sanitized preview and print CSS.
Alternatives: IndexedDB/model changes and server storage are unnecessary for one small draft.

## Uncertainties resolved
The minimum product is one local document, no cloud persistence. Excel-like refers to navigation/command presentation, not spreadsheet functionality. Existing converters remain the export engines. Mermaid needs an offline fallback because the current shell uses a CDN. Formal Spec Kit setup/constitution checks cannot be performed in this repository; this limitation is recorded, not treated as a pass.
