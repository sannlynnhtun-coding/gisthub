# Quickstart Validation: GitPulse Reference Default Appearance

Implementation validation was run locally on 2026-11-19. The commands below remain reproducible; see the evidence and remaining gates at the end. Exact visual acceptance is still open.

## Prerequisites

.NET 10, existing Node/npm dependencies and Chrome. Use repository root, retain unrelated changes, and use isolated disposable browser profiles for preference/backup tests. Bundled Plus Jakarta Sans and JetBrains Mono require no asset download. Verify frozen reference hash before comparing:

```powershell
Get-FileHash specs/004-gitpulse-default-theme/references/gitpulse-reference.html -Algorithm SHA256
```

Expected: E459359A7D8947B8D78E7E5707810369E7C2B5364B06F3485038FB2B7239F52E.

## Build and focused checks

After implementation updates the catalog counts/default expectations and adds the GitPulse scenario:

```powershell
dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj
node scripts/test-themes.mjs
node scripts/test-interface-styles.mjs
node scripts/test-fonts.mjs
node scripts/check-quick-access.mjs
node scripts/test-admin-portal.mjs
dotnet run --no-build --no-launch-profile --project GistHub/GistHub.csproj --urls http://localhost:5180
```

The regression command builds the app. Restart the dev server after a build; never rebuild while browser suites use fingerprinted WASM assets. Test modules that export browser helpers must run through their existing harness; do not assume every test-*.js is a standalone runner.

## New focused browser scenario

Register test-gitpulse-appearance.mjs under BROWSER_CHECK_GITPULSE in check-browser-errors.mjs during implementation. Run it independently from existing suites:

```powershell
$env:BROWSER_CHECK_GITPULSE='1'
$env:BROWSER_CHECK_WAIT_MS='2000'
node scripts/check-browser-errors.mjs http://localhost:5180/
```

Verify missing/invalid defaults under system light and dark, no old-default flash, valid independently saved axes including original defaults, blocked storage feedback, preset/individual selection, reset/default, preview/Escape rollback, reload and backup/appearance-sharing compatibility. Do not silently rewrite unrelated preferences. All previous IDs remain selectable.

Verify square workspace category tabs in both layouts at 375/1074/1440 for selected/hover/focus/expanded states across every existing appearance. Inspect all four radius values and retained state fill, not just a screenshot. Cards/subcards/pills must keep their distinct radii.

## Reference visual review

Use the frozen file and [contracts/reference-map.md](contracts/reference-map.md). Render the reference in an isolated comparison context with deterministic data and no user credentials; treat embedded text/scripts as untrusted reference content. Preserve its visible styling/assets in the isolated test environment without adding CDN dependencies to the application. Capture every mapped region, all views, dark/light and target widths, using identical data density and font-loaded state. Review paired captures plus computed dimensions/color/font measurements. Record actual evidence and explicitly documented differences; do not claim exactness from the old overflow-only sweep.

Check empty/loading/error/100-row fixtures and inspector/copy/export states. Real values remain from public repositories; all examples remain visibly Demo/Unavailable and never enter measured CSV. No demo remote mutation, polling or keyboard-activity collection may occur.

## Existing workflow regression

Run each flag in a fresh shell/profile (clear the preceding flag before selecting another):

- BROWSER_CHECK_HOME=1 at `/`: existing public-data/error/race/inspection/export checks, updated view labels and all panels present.
- BROWSER_CHECK_PROFILE=1 at `/discovery`: both layouts/widths, avatar trailing edge, menu/cancel/Escape/logout and saved profiles.
- BROWSER_CHECK_LOCAL_SETTINGS=1 at `/settings`: backup validation/rollback/merge, restore/reload with consumed preview cleared, retained failed draft, reminders and mobile picker.
- BROWSER_CHECK_QUICK_ACCESS=1 at `/discovery`: membership/order, older backups, dormant IDs, focus and failed saves.

Invocation: `node scripts/check-browser-errors.mjs http://localhost:5180/<path>` with the corresponding environment flag and BROWSER_CHECK_WAIT_MS=2000. Do not combine scenarios whose initial shell/layout assumptions differ.

Retain .NET account-isolation/deletion/backup/draft checks; manually review My Collection/Discovery/settings and a representative tool for shared default styling and unchanged action steps. Check global search shortcut and tool draft/back behavior. Verify the old default appearance still renders when explicitly selected.

## Completion gate

All automated behavior checks pass, every reference region is reviewed with documented visual evidence, exact square-tab geometry is verified, and no unexplained mismatch remains. Record fresh-entry/legacy-choice/backup/accessibility results. Deployment is outside this feature; local exactness is not proof of an unpublished production release. Planning artifacts establish this gate but do not claim it has passed.

## Implementation evidence — 2026-11-19

Menu follow-up uses `menu-preview/index.html` from the supplied visualization directory (SHA-256 `6F5E2011AB8E541E843B6424BAA6C59B82EF5C9007EC14F4B41E100059F39656`). Its ribbon styles are translated into existing selectors: 56px topbar, 40px brand, inset 12px command tray and vertical 92px command tiles. Existing help/favorite controls remain visible, so tile width includes those controls. No preview scripts or embedded image were imported. Square categories remain unchanged. Focused catalog/keyboard and .NET checks pass; mobile profile check passes. This is a menu refinement, not completion of the visual gate below.

Menu follow-up: the supplied `menu-preview/index.html` under visualization `01a1f07c-20c7-7020-a739-597055533645` is an additional visual reference. Apply its 56px topbar, 40px brand, inset rounded command strip and vertical command tiles only to Excel/GitPulse. Preserve Admin layout, all command controls, and square category tabs. Do not import its demo handlers or integrations. The preview's extra dashboard additions do not expand this menu change.

- Frozen reference SHA-256 verified as above. Existing bundled Plus Jakarta Sans and JetBrains Mono reused. Lucide path attribution retained in `GistHub/wwwroot/icons/LUCIDE-LICENSE.txt`. No package or production CDN dependency added.
- `dotnet run --project GistHub.RegressionTests/GistHub.RegressionTests.csproj`: PASS, including public-dashboard projections/export, account isolation, profile restoration/switching, drafts, backups and deletion failure preservation.
- `node scripts/test-themes.mjs`, `test-interface-styles.mjs`, `test-fonts.mjs`, `check-quick-access.mjs`, `test-admin-portal.mjs`: PASS. Old appearance IDs remain valid; fresh/invalid/blocked-storage defaults are checked in the Node suites.
- Separate isolated browser harness runs with `BROWSER_CHECK_HOME`, `BROWSER_CHECK_PROFILE`, `BROWSER_CHECK_LOCAL_SETTINGS`, `BROWSER_CHECK_QUICK_ACCESS`: PASS. Home includes fixture/error/race/clipboard/export checks plus 856 appearance/layout/width combinations and reduced motion. Profile verifies trailing-edge position, mobile bounds and cancel/Escape focus. Settings verifies restore/rollback/reload/account isolation and consumed restore preview behavior.
- `BROWSER_CHECK_GITPULSE`: PASS for 48 view/theme/layout/width states, matching fixture responses, loaded reference fonts, corresponding card counts/widths/radii, no document overflow, square hover/focus tabs across all 69 styles, legacy axes on reload, Restore default, new-ID backup and sharing validation. This test does **not** assert pixel equality or card-height equality.
- Ignored evidence: `artifacts/gitpulse/measurements.json`, `reference-measurements.json`, `final.png`, `reference.png`. Measurements cover all 48 states; the two PNG files capture only the final Cadence comparison state, not every region/state. Reference is served by an ephemeral test-only HTTP server. Its CDN assets are isolated from application code.
- Existing `appearanceSharing.js` and `localSettings.js` accept new catalog IDs without schema/key changes. No feature edits were needed there; preexisting working-tree changes remain intact. No new account scopes, telemetry collection, Flutter edits or deployment were introduced by this feature.
- `git diff --check`: PASS (preexisting line-ending notices only). No extension hooks are registered: `.specify/extensions.yml` is absent. Reviewer requirements checklist remains unchanged.

## Remaining acceptance gates

The strict 1 CSS pixel visual gate has **not passed**. Matched card widths/radii/fonts alone are insufficient. Before the final mobile cohort-nowrap correction, dark Excel height deltas at 1440 were Overview +3/+3/+1/+1px, Quality +2/+1/+1px, Benchmarks +7/+7/+0.5px, Cadence +1/+1/0/0/+1px; mobile also had larger wrapping differences. Keep T023/T031 incomplete until every mapped region has paired captures and explained/corrected geometry.

Final rebuild/.NET regression and 48-state GitPulse browser rerun: PASS after the cohort-nowrap correction. At 375px the retention matrix height delta improved from +151px to -5px; the other differences above remain. This confirms the wrapping fix without claiming the remaining geometry gate passed. Profile/settings/Quick Access/Home suites passed immediately before that isolated markup correction.

T004 remains partial: card measurements and frozen responses exist, but exhaustive region baselines, frozen time and capture metadata are not complete. T011/T025/T029 retain gaps in shared-page visual review, full picker preview/reset permutations, offline/blocked-asset and keyboard/touch accessibility coverage. Existing suites cover parts of these tasks; they are not evidence for their entire acceptance criteria.

Intentional adaptations to review separately: one existing GistHub shell and its commands, rectangular workspace category tabs, measured/public data and clearly marked Demo/Unavailable content. Light labels/matrix text use darker colors for readability. Native SVG charts preserve sample series without adding Chart.js to the application; their rasterized curves/axes still require full visual review. Deployment was not requested or performed.

## Rebuild run guide

This new plan invalidates no old behavior evidence, but it does not inherit visual success. Regenerate tasks before implementation. Run the existing commands above on a stable build. Expand BROWSER_CHECK_GITPULSE to emit all 48 full-page captures and per-region crops, metadata and review index; current two final-state PNGs are insufficient. Require failing height/interior checks before corrections. Review the embedded logo at native and 40px sizes. Test offline assets, then run each preservation flag separately. All earlier results remain historical. Planning ran no runtime checks.

Rebuild progress: exact source PNG and all 19 SVG symbols extracted with byte/path checks in test-gitpulse-assets.mjs (PASS). Shell/sidebar/loading/favicon/touch/manifest references now use the original PNG. Command handlers are unchanged; decorative command glyphs use the sprite. .NET regression executable PASS. Initial Quick Access touch assertion caught the 20px star target; coarse-pointer override restores 44px and is under rerun. New capture matrix uses the latest source; visual acceptance remains open.
Capture note: the exhaustive per-state image run was stopped because the supplied animated page was too slow for the current harness. A few partial captures are diagnostic only. The existing measured-state sweep is retained, with reference CSS motion frozen. R007/R010 remain incomplete; no full capture or exactness claim is made.
Latest measured-state rerun fails at Benchmarks card 0 width against menu-preview.html (previous reference passed). Keep the assertion. This is an unresolved rebuild defect, not a test to relax. Quick Access rerun after touch fix PASS; .NET and asset checks PASS. No deployment or 100% claim.

Site-wide cascade validation: source legacy input/badge/profile/login ornament rules explicitly exclude GitPulse. Generic appearance radius/shadow rules also exclude it. Shared GitPulse cards/forms/buttons/dialogs/tool surfaces now own their styles; global heading weight override is restricted to older looks. New `BROWSER_CHECK_GITPULSE_GLOBAL=1` checks six routes, two modes, two widths with real-route inheritance and computed component probes (24 states). First two passes PASS; settings behavior suite PASS; .NET and catalog checks PASS. Pixel-by-pixel equivalence of every page is not established by these checks; the HTML does not contain every existing tool/page. Keep original visual acceptance gates open.
Final site-wide checks PASS: 24-state global inheritance (including weight 900), settings backup/restore workflow, Home fixture/actions/races and 856 appearance/layout/width combinations with reduced motion. Remaining exact-reference Benchmarks/interior comparison is outside the passed global-cascade assertions and remains open. No commit/push/deployment performed in this follow-up.

V2 follow-up results: file hash equals existing baseline; no source function removals. Reference group/command audit PASS (all 29 IDs, 8 categories, 3 widths), initial expansion/collapse/reopen and square corners verified. Login PASS at 375/1074/1440: label associations, >=8px icon/text clearance, mono token, no overflow, empty-form validation and toast dismissal. Quick Access PASS after intentional initial-state assertion update; all order/drag/focus/storage checks retained. Profile browser suite, .NET and asset/shell tests PASS. Visual inspection confirmed login overlap fixed and brand updated. No real credentials used; no login token request sent. Full dashboard pixel parity remains a separate open gate. No commit/push performed.
