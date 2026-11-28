# Local foundation evidence — T001-T006

**Date**: 2026-11-25. No Google authorization or live Sheets request; no IndexedDB open/upgrade.

## Implemented

- Public disabled-by-default options model; no runtime binding/DI or automatic authorization.
- Explicit allowlisted operation/envelope, connection, metadata, outbox and receipt records; numeric IDs/counters remain strings.
- Pure C# canonical JSON/body hashing and deterministic scoped causal replay. Missing/cyclic/cross-entity dependencies, hash/scope/schema errors and duplicate-ID changed bodies are rejected. Different concurrent candidates are retained; same values converge visibly; entity lifecycle deletion/edit races and competing resolutions remain conflicts. Incoming row order and identical duplicate rows do not affect replay.
- Shared serializer/hash vectors and complete JavaScript-produced two-device envelopes validated by C# and JavaScript; no fixture contains real credentials.
- Standalone disposable-file live harness and protected localhost control-plane smoke checks. No application UI, active Google integration, IndexedDB migration or Flutter changes.

## Commands and outcomes

- `dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj -- --google-sync-only`: PASS, 42 checks. Build succeeded as part of the run.
- `dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj --no-build`: PASS, full existing executable regression suite plus the Google protocol checks.
- `node scripts/test-google-sync-protocol.mjs`: PASS, shared vectors, large string IDs, closure, duplicate/corruption handling and admission limits.
- `node scripts/test-google-sync-harness.mjs`: PASS, inline module syntax, localhost session/origin control, matching-account fingerprint, rejected token-input field, paired round/final barriers and redacted outcome coordination. This test uses synthetic control messages, not Google.
- Starting `node scripts/test-google-sheets-transport.mjs` without public client configuration: correctly refuses with Live gate NOT RUN; no server authorization or Google write occurs.
- `git diff --check`: PASS (repository line-ending notices are informational).

## Remaining gate

User reports no Google Cloud OAuth client exists. T007 cannot pass without setup and real two-profile evidence. Actual network interruption/near-capacity live scenarios remain required alongside the normal 100-round run. See transport.md and ../google-setup.md. Current `GistHub/wwwroot/js/indexedDb.js` databaseVersion remains 4, and existing app flow is not wired to the new models/services.
