# Browser validation — 2026-11-15

Site started at http://localhost:5187/tools/markdown-converters using dotnet run. Chrome DevTools used after in-app browser bridge failed.

Final live page run: 26/26 converters passed via select/source/Convert controls. Every non-PDF Download action produced a nonempty Blob; Word and DOCX produced ZIP documents. Exported DOCX was imported with the actual Mammoth library. A generated valid one-page PDF yielded Hello PDF through actual PDF.js. URL import fetched a local HTML fixture. Preview script removal checked throughout.

Additional passing checks: invalid OpenAPI/null, unsafe URL scheme, missing binary files, oversized text/binary input, nested HTML lists, wiki code preservation, numbered lists, quotes, Telegram bold, Discord headings, rich HTML paste sanitization. PDF export invoked iframe print with sanitized conversion snapshot (print intercepted for automation; no operating-system PDF was saved).

Rich clipboard write/read passed once with HTML MIME content. Subsequent clipboard attempts were blocked by browser focus restrictions. UI displayed manual-copy feedback and retained output. Final console: no errors or warnings.

Fixes: protect wiki code from emphasis substitutions; retain nested HTML lists; preserve numbered lists and platform quote/list syntax; reduce structural whitespace; correct common Telegram emphasis and WhatsApp link text; escape plain-text Markdown characters; validate OpenAPI object; handle rich clipboard paste; clear successfully consumed file selection; retain URL input; print from the completed result snapshot.

Build: dotnet build GistHub/GistHub.csproj --no-restore -v quiet passed, zero warnings/errors. node scripts/test-markdown-converters.mjs passed.

Re-run: temporarily copy scripts/fixtures/markdown-converters.html to GistHub/wwwroot/converter-test.html before starting the site. Evaluate exported checkAllConverters from scripts/test-markdown-converters-browser.mjs in the live page. Remove the temporary web fixture afterward. The harness intercepts download clicks to inspect Blobs without saving 25 files.

Not tested: actual destination apps/accounts, full document-format fidelity, mobile viewport, OS print/save dialog, scanned-document OCR (unsupported). Common formatting is supported; cloud inputs require pasted/exported content and URL inputs require CORS.
