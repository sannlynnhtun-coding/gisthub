# Markdown converters

Date: 2026-11-15. Branch: main (unchanged).

User authorized skipping missing rules.md and using the existing structure instead of .specify. Adapted speckit-plan outputs; no constitution or extension hooks exist.

Scope: all 26 requested choices in one workbench, registered in ToolWorkspace, NavMenu, Tools guide and ToolHelpContent. Reuse marked, DOMPurify, MarkdownDocxConverter and downloads. No storage, account, fixture or configuration changes. Existing converters and routes remain available.

Workflow: select grouped format, paste or import, convert, review preview/output, copy or download. Retain source on failure. DOCX export uses the conversion snapshot. Import limits: 10 MB binary, 1 MB text/extracted text. Sanitize HTML before preview, rich clipboard and print; omit remote images. No backend or credentials.

Limits: cloud inputs use exported HTML or pasted text, no direct account integrations. URL fetch requires CORS. OpenAPI accepts JSON. PDF is text extraction (no OCR); export is browser print. Chat conversion covers common formatting with lossy unsupported constructs. Import engines load pinned CDN modules.
