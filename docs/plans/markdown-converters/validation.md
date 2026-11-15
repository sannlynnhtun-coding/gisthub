# Browser validation — 2026-11-15

Site started at http://localhost:5187/tools/markdown-converters using dotnet run. Chrome DevTools used after in-app browser bridge failed.

Final live page run: 26/26 converters passed via select/source/Convert controls. Every non-PDF Download action produced a nonempty Blob; Word and DOCX produced ZIP documents. Exported DOCX was imported with the actual Mammoth library. A generated valid one-page PDF yielded Hello PDF through actual PDF.js. URL import fetched a local HTML fixture. Preview script removal checked throughout.

Additional passing checks: invalid OpenAPI/null, unsafe URL scheme, missing binary files, oversized text/binary input, nested HTML lists, wiki code preservation, numbered lists, quotes, Telegram bold, Discord headings, rich HTML paste sanitization. PDF export invoked iframe print with sanitized conversion snapshot (print intercepted for automation; no operating-system PDF was saved).

Rich clipboard write/read passed once with HTML MIME content. Subsequent clipboard attempts were blocked by browser focus restrictions. UI displayed manual-copy feedback and retained output. Final console: no errors or warnings.

Fixes: protect wiki code from emphasis substitutions; retain nested HTML lists; preserve numbered lists and platform quote/list syntax; reduce structural whitespace; correct common Telegram emphasis and WhatsApp link text; escape plain-text Markdown characters; validate OpenAPI object; handle rich clipboard paste; clear successfully consumed file selection; retain URL input; print from the completed result snapshot.

Build: dotnet build GistHub/GistHub.csproj --no-restore -v quiet passed, zero warnings/errors. node scripts/test-markdown-converters.mjs passed.

Re-run: temporarily copy scripts/fixtures/markdown-converters.html to GistHub/wwwroot/converter-test.html before starting the site. Evaluate exported checkAllConverters from scripts/test-markdown-converters-browser.mjs in the live page. Remove the temporary web fixture afterward. The harness intercepts download clicks to inspect Blobs without saving 25 files.

Not tested: actual destination apps/accounts, full document-format fidelity, mobile viewport, OS print/save dialog, scanned-document OCR (unsupported). Common formatting is supported; cloud inputs require pasted/exported content and URL inputs require CORS.


## Mobile browser validation — 2026-11-15

Final Chrome touch/mobile emulation matrix: 320×740 (DPR 2), 390×844 (DPR 3), 844×390 landscape (DPR 3), 768×1024 tablet (DPR 2). All 26 converters passed at each size (104 checks), including non-PDF export Blobs, DOCX round trip and PDF extraction. No document/workbench horizontal overflow. Source, actions, result and help remained reachable by scrolling. Stress-tested wide tables, long code lines and URLs; these remain contained within preview scrolling. Expanded help and long filenames also fit at tablet size. No console errors/warnings.

Fixed file-input intrinsic-width overflow at 320 px, increased controls to 44 px minimum height and 16 px text through tablet widths, wrapped phone actions into a grid, constrained phone editor height, contained preview overflow and long status strings, removed duplicate workspace heading using the existing header structure, and moved lengthy import notes into expandable help. No conversion or storage behavior changed.

Reproduction: use checkAllConverters from test-markdown-converters-browser.mjs together with checkMobileConverters from test-markdown-converters-mobile.mjs in the live page. Run at each viewport above with the temporary URL fixture described earlier.

Limits: Chrome emulation only; physical iOS/Android keyboards, native file pickers, platform share/download UI and Safari-specific behavior were not tested.
