# Research

Reference: https://www.markdowntools.io/ and /markdown-to-html, inspected 2026-11-15.
Decision: adopt directional groups and source/result workflow in one workbench, reusing existing rendering and DOCX export. Separate pages and a new backend add unnecessary duplication.
Decision: use Mammoth and PDF.js only for binary imports because the repository has no document readers. Load pinned browser libraries on demand, never send documents to a conversion server. Network availability is required on first use.
Decision: URL import uses browser fetch, not a proxy; report CORS failures. Cloud editors accept exported content rather than introducing account connections.
