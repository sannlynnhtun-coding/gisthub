# Quickstart Validation: GitHub Dashboard Home

## Implementation evidence (2026-11-19)

Baseline: existing Flutter appearance, shell/theme, README and script edits were retained. Branch remains main. No constitution or extension hooks exist. The prerequisites script is absent, so the saved feature pointer and design documents were used directly. Existing .gitignore covers .NET/Node outputs; missing web build/editor/environment patterns were appended. No publishing, Docker, ESLint/Prettier, Terraform or Helm configuration was detected.

Browser harness: set BROWSER_CHECK_HOME=1 and BROWSER_CHECK_WAIT_MS=2000 in the shell, then run `node scripts/check-browser-errors.mjs http://localhost:5180/`. This invokes the exported dashboard scenario and appearance checks in an isolated Chrome profile with deterministic public HTTP fixtures. Start the app with `dotnet run --no-launch-profile --project GistHub/GistHub.csproj --urls http://localhost:5180` to avoid launch-profile port overrides.

Completed: .NET regression executable passes, including dashboard HTTP/validation/scope/errors/summary/filter/quality/CSV/clone checks and existing profile, deletion, backup, draft, search, visibility and converter checks. Quick Access catalog/backup/order checks, Admin portal keyboard checks, and existing theme and interface-style Node checks pass. Final browser outcomes follow below.

### Final validation outcomes

- `dotnet build GistHub/GistHub.csproj --no-restore`: PASS, zero compiler warnings/errors. Tailwind reports its existing broad content pattern and outdated Browserslist data; no package update was made.
- .NET regression executable: PASS, including late A/B responses, disposal and rendered profile-change invalidation tests added for the dashboard.
- `node scripts/test-home-dashboard.mjs`, `node scripts/check-quick-access.mjs`, `node scripts/test-admin-portal.mjs`, `node scripts/test-themes.mjs`, `node scripts/test-interface-styles.mjs`: PASS.
- BROWSER_CHECK_HOME scenario: PASS on the final stable build. Fixture identities, measured summaries, escaped metadata, filters, inspection/Escape/focus restoration, clipboard denial/success, CSV download and failure feedback, invalid/missing/rate-limited/offline users, zero/full-page scope and overlapping loads pass. Both shell layouts retain Home/My Collection order and collection/Discovery routes. All four views work, demos are labeled and no dashboard request carries authorization.
- Appearance browser sweep: PASS across 840 preset/theme/layout/width combinations (overview at 375px and 1440px), plus all four views under reduced motion. Actual empty and populated pages were visually inspected in Chrome using a local fixture. This is not a screen-reader audit or a measured contrast audit of every rendered element.
- Existing Quick Access browser scenario: PASS for membership, drag/drop, moves, persistence, focus, reusable commands, backups, mobile, malformed storage and failed writes.
- Existing profile-menu browser scenario: PASS after aligning wrapped mobile header actions with margin-inline-start:auto. Tested Excel and Admin portal at 1280px and 390px; avatar trailing-edge bounds, popover bounds, identity/account list, Escape, cancel focus, logout confirmation and retained saved profiles pass. The original right-edge assertion remains intact; logout selection explicitly targets the logout control.
- Existing local-settings browser scenario: PASS after clearing Json/Preview and persisting the consumed settings draft only after restoreBackup succeeds, before reload. Full favorites, backup/restore, account isolation, invalid input, transaction rollback, reminder persistence, download failure/concurrent changes, bookmark ordering, long names/tags and mobile checks pass. New .NET regression assertions reproduced the defect before the fix and verify successful draft clearing and failed-restore input retention.
- `git diff --check`: PASS. Requirements checklist remains read-only and 16/16 checked.
- Production gate: PARTIAL. Confirmed https://gist-hub.vercel.app from the repository About link. HTTP probes and a real isolated Chrome page both returned 200 for the public user and first-100-repositories proxy endpoints; login matched sannlynnhtun-coding and all 100 rows were public. The root serves its shell but the deployed older app redirects to /my-gists and contains no new Home dashboard. New Home production acceptance therefore remains pending deployment. No deployment or live data changes were made. The Vercel connector requires reauthentication, but public read-only checks succeeded without it.

The local preview server is running at http://localhost:5180/. Build before starting it with `--no-build`; rebuilding underneath the running Blazor dev server caused stale fingerprinted-asset failures during one intermediate run, resolved by a clean server restart. Keep builds and browser validation separate.

The implementation and validation results are recorded above and below; the following sections retain the repeatable validation procedure.

## Prerequisites and setup

Use the existing .NET 10 SDK, Node/npm and supported desktop browser. Run from repository root. Preserve unrelated working-tree changes. Use a disposable local profile for mutation/backup checks.

```powershell
npm --prefix GistHub ci
dotnet build GistHub/GistHub.csproj
dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj
node scripts/check-quick-access.mjs
node scripts/test-admin-portal.mjs
dotnet run --project GistHub/GistHub.csproj --urls http://localhost:5180
```

Confirm any launch-profile URL override from server output. Use the running URL for browser checks. Existing browser scripts export harness functions; run them through their existing harness rather than assuming every `test-*.mjs` is a standalone executable. Add the dashboard scenario to that harness during implementation.

## Fixture and service checks

Use fake HTTP responses, not live changing counts. Cover identity + mixed repository rows, zero repos, a full 100-row page, missing fields, malicious text/formula/URL values, 404, 403/429, network errors, and delayed A/B loads. Assert request paths, omitted Authorization, maximum two requests, correct error/result separation, exact summaries, stable filters/sorting and scope. Assert safe CSV through the existing converter and register new tests in the executable regression harness. Update the existing IGithubService fake.

Expected: full-page scope is visibly potentially incomplete; missing values and zero denominators remain honest; B remains visible after delayed A finishes. No private rows or active profile token enter results.

## Browser flow

1. Visit `/` with/without bookmarks and with/without an active profile. Home renders in every case. Profile username loads when ready; signed-out users can enter one without connecting an account.
2. In Excel and Admin portal, open Home commands. Home appears first and My Collection second. Brand links return to Home. My Collection retains its favorites query and direct collection/filter links remain functional; Discovery remains Discovery.
3. With deterministic public fixtures, load a username, inspect summary and chart equivalents, search/filter/sort repositories, open/close inspection via keyboard, copy clone command, open GitHub, and export all loaded rows. Compare against [contracts/dashboard.md](contracts/dashboard.md).
4. Visit all four views. Check measured quality denominators and adjacent Demo/Unavailable labels. Demo controls make no remote mutations. CSV contains only loaded repository telemetry.
5. Deny clipboard, trigger download failure, offline, 404, rate limit, no matches and empty repos; each has accurate feedback and a recovery path. Change users rapidly and switch active profile mid-load; no old result appears under the new identity.
6. Pin/reorder Home in Quick Access, then restore an older saved command array without Home. Existing membership/order survives; adding support never auto-pins it. Check settings backup/restore accepts the new command.
7. Test at 375px and 1440px in both shell layouts, every existing appearance preset and supported light/dark mode. Change appearance while Home remains open; text/controls/charts follow it immediately. Check keyboard-only access, focus restoration, chart text, reduced motion, touch targets and no document-level horizontal overflow.
8. Smoke-test global search/shortcut, category commands, tool draft/back behavior, collection creation/edit/deletion/confirmation, favorites, profile switching, bookmark/settings import/export in a disposable profile. Existing workflows and data isolation must match their pre-feature behavior.

## Release gate

All focused automated checks pass and browser outcomes above are recorded. Smoke-test the deployed base-path `/` and `/api/github/users/...` proxy with public data; production proxy behavior cannot be proven by local direct requests. No runtime validation is claimed by the planning artifacts.


### Follow-up validation commands (2026-11-19)

The .NET regression executable rebuilt the app successfully and passed after the corrections. The server was then restarted with --no-build; no builds ran during browser validation. Each suite was run in a fresh isolated Chrome profile:

- BROWSER_CHECK_PROFILE=1 with http://localhost:5180/discovery: PASS in both shell layouts and both widths.
- BROWSER_CHECK_LOCAL_SETTINGS=1 with http://localhost:5180/settings: PASS, including reload after restore.
- BROWSER_CHECK_HOME=1 with http://localhost:5180/: PASS, including all 840 appearance combinations and four views.
- BROWSER_CHECK_QUICK_ACCESS=1 with http://localhost:5180/discovery: PASS.
- node scripts/check-quick-access.mjs and node scripts/test-admin-portal.mjs: PASS.
- git diff --check: PASS.

Run these browser flags separately: the Home appearance sweep finishes in Admin portal while the existing Quick Access browser scenario assumes the initial Excel layout. A combined run fails a harness layout precondition; independent runs pass without weakening checks. Full screen-reader auditing, real remote gist mutations and deploying the new release were not performed. Existing .NET tests cover gist data preservation, failures, account isolation and backups.
