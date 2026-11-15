# Validation

Run `dotnet build GistHub/GistHub.csproj --no-restore` and `node scripts/test-markdown-converters.mjs`.
Open /tools/markdown-converters or Tools > Markdown converters. Exercise each group with headings, emphasis, links, lists and code. Review copy/download, rich HTML paste into an editor, browser Save as PDF, and editable Word output.
Import small DOCX and text PDFs; confirm scanned PDF feedback, oversized-file rejection and unchanged source on failure. Test exported HTML from Google Docs/Notion, Jira/Confluence wiki text, CORS-enabled URLs and OpenAPI JSON. Test clipboard denial, offline library loading, narrow screens and keyboard labels.
Automated build, focused checks and the 26-converter browser pass completed. See validation.md for evidence and remaining limits.
