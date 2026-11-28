# Quickstart Validation Guide: Google Sheets Sync

This guide is for the later implementation phase. The feature is not implemented by this planning task; do not interpret these steps as completed tests. Use disposable profiles/files and copied fixtures, not production user data.

## Current implementation checkpoint

Setup/models/pure codec and a standalone transport harness are implemented. No app sync UI, account-storage migration or automatic sync is active. See [Google setup and live gate](google-setup.md) for exact steps. Public configuration model section: `GoogleSheetsSync`, properties `ClientId`, `ProjectNumber`, `PickerApiKey`; application binding is pending T021, so adding app configuration alone does not enable sync yet.

## Prerequisites and Google setup

- .NET 10 SDK, Node/npm and two isolated supported browser profiles (plus a physical mobile browser/PWA for acceptance).
- One Google Cloud project: enable Sheets API, Drive API and Google Picker API; configure Google Auth Platform branding/audience and test users during testing.
- Create Web application OAuth client. Allow the exact origin `http://localhost:5187` and later the real production HTTPS origin; origins have no route path. Restrict the Picker API key by website referrer and API. Use the project number for Picker app ID.
- Request drive.file only. Verify Drive about.get returns user.permissionId and the selected file is personally owned. Configure client ID/project number/restricted key via the future public app config; no secrets in browser assets.
- Keep Google settings and credentials unmodified during this documentation-only task. Before public release, complete applicable consent/branding requirements and verify production origins.

References: research.md and contracts/sync-protocol.md. Public values are configuration, not a client secret.

## Existing runnable commands

From repository root, after implementation is authorized and dependencies installed:

```powershell
npm --prefix GistHub ci
dotnet build GistHub/GistHub.csproj
dotnet run --project GistHub/GistHub.csproj --no-launch-profile --urls http://localhost:5187
```

Keep the app running; use another terminal for existing checks:

```powershell
dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj
node scripts/test-local-settings.mjs http://localhost:5187
node scripts/check-browser-errors.mjs http://localhost:5187
```

These existing commands are starting points; future protocol/storage regression cases must be added to the existing executable/harness during implementation. Do not claim a nonexistent sync-specific script is available. No builds or runtime tests were run for the documentation-only plan.

## Validation scenarios and expected results

1. **Transport gate before integration**: Use a disposable file and two profiles; execute 100 rounds of simultaneous unique appends, dropped responses and same-ID retries. All expected ID/hash pairs survive; duplicate physical rows have one logical effect. Failed gate stops delivery. Include parent/child chains across batches and interruptions before/after each response; each committed prefix is causally closed. Reconcile identical IDs before advancing dependent batches.
2. **Preserving upgrade**: Start from a copied version-4 fixture with two GitHub profiles, gists, empty groups and preferences. Run future upgrade, interrupt/retry and block with another tab. No gist/token/group data lost; legacy unowned groups are not silently shared. No production DB touched.
3. **First merge**: A and B contain overlapping bookmarks, name-only legacy collections and distinct local tags. Connect A, then select the exact file on B. Preview counts/aliases are correct; cancel writes nothing; confirm merges without duplicate logical records. Changed preview inputs trigger refresh. Include conflicting initial collection names and theme/font candidates: confirming merge alone retains both candidates, explicit resolution selects a winner and unrelated records proceed. Verify this in US1 using generic appearance persistence, without US2 ongoing-conflict or US4 live-picker dependencies. Repeat imports and destination switches with several source candidates/deletions; no source parent IDs may cross workspace boundaries.
4. **Missing gists**: Join from empty cache. Metadata survives. Fetch gist content via existing GitHub sync and confirm references appear without writing a GitHub gist.
5. **Offline durability**: Make 20 edits offline, reload, reconnect, authorize if required and sync. All edits converge; repeat successful sync three times with no new logical records.
6. **Conflict causality**: Both devices rename the same collection from the same base. Both candidates remain; unrelated tag sync completes. Resolve on A and sync B: chosen name converges. Repeat with delete-versus-edit and simultaneous different resolutions; no silent loss. Permute replay row order and inject duplicate identical rows; state is equivalent.
7. **Scoped appearance**: Accounts A/B have distinct theme/font. Sync A across two devices, switch B and back. Each account retains its choices; layout and excluded settings remain byte-for-byte unchanged. Test system-theme choice, unavailable font and guest defaults.
8. **Connection isolation**: Disconnect with pending work, reload and reconnect the same tuple: resume. Select a different account/file: preview required; cancel retains originals, confirm imports new scoped operations, source work retained until destination acknowledgement. Switch accounts during an in-flight request: no cross-account UI/data application. Pause an append response, disconnect and allow remote completion: dispatch no new request or follow-up verification, permit acknowledgement only for the original tuple and retain uncertain outcomes until reconnect.
9. **Failure/recovery**: Deny consent, close popup, expire/revoke token, lose network after append, inject 429/403/404/5xx, delete/modify test sheet and exceed capacity. Accurate text status and appropriate action; pending changes retained; no secret-bearing logs or false synchronized state. Test exact capacity boundaries, a projected-overflow batch and concurrent near-limit admissions: overshoot remains valid and readable/acknowledgeable, appends including retries pause, and unverified work remains pending without truncation. Upload thresholds are not read cutoffs; resource-limited reads report incomplete reconciliation. Verify explicit new-storage preview/merge recovery.
10. **Data/privacy inspection**: Inspect outgoing requests and test sheet: only allowlisted metadata/theme/font; no token cells, profiles, gist files, layout or drafts. Authorization header is transport-only. Existing JSON backup/restore remains functional without accidentally serializing tokens or sync internals.
11. **Performance/accessibility**: Seed 1,000 bookmarks, 100 collections and 500 assignments. Two-device setup under five minutes excluding consent; normal edit visible within 30 seconds of receiver sync request under stable, unthrottled conditions. Keyboard-only connection/preview/conflict flow works; mobile popup and installed PWA reauthorization work.

## Canonical-body validation

Run shared C#/JavaScript RFC 8785 JCS vectors for Unicode, escaping, property order, deduplicated/sorted parentIds and absent displayTime. Hash only UTF-8 canonical body bytes without BOM; payloadHash is separate. Verify the protocol's serializer-only SHA-256 fixture and valid complete operation envelopes. A same-ID different-body row is corruption; the hash is not owner authentication.

## Completion evidence

Record browser/OS versions, fixture sizes, elapsed times, request counts, redacted outcome logs and before/after metadata digests. Map evidence to SC-001–SC-007. Pass is contingent on real runtime results; design review alone is not evidence of working synchronization.
