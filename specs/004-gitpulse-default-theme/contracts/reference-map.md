# Reference Region Map and Acceptance Evidence

The frozen HTML is the source of truth. This inventory identifies every requested region, its existing data boundary and its comparison state; it is not an authorization to execute reference scripts in the application.

Implementation evidence is indexed in [quickstart.md](../quickstart.md). All four view compositions are present. Automated comparison currently measures top-level card counts, width/height, background and radius at 48 matched states; width/radius/font checks pass. This does not constitute full region/pixel acceptance. Detailed captures, height alignment and the remaining interaction/accessibility cases remain open. Intentional accessibility adaptation: reference light-mode secondary labels and matrix text are darkened for readability. Keep this exception explicit during visual review.

| View/region | Required composition | Data/interaction boundary |
| --- | --- | --- |
| Shared reference header | Compact brand/username/status/view/search/appearance/profile treatment | Integrate into existing shell/controls; no duplicate header or identity system. Preserve Excel/Admin structure and extra commands. |
| Hero | Small breadcrumb, compact identity heading, profile metadata, sample-username pills and export action | Existing public developer load/export; public username examples may call that same validated loader, never switch the signed-in profile. Followers can say unavailable without another API integration. |
| Overview: Active dev hours | 4/12 desktop column, 24px card, radial segmented clock/summary and weekly-goal segments | Demo hours/segments, public repository badge can be measured and must be distinguished. |
| Overview: Workflow and command pulse | 8/12 desktop column, keyboard heat map, tactile keycaps, week/month segmented selector, mini summaries | Deterministic Demo; selector changes local demo series, no real key logging. |
| Overview: Ecosystem/stars | 5/12 desktop column, polar/radial chart, legend/color dots and clear-filter affordance | Group loaded repositories' primary language and sum stars; label metric, reuse language filter. |
| Overview: Repository explorer | 7/12 desktop column, compact search/filter/sort, status badges and repository rows | Preserve existing explorer/inspection/clone/link/export semantics; extra supported actions remain reachable. |
| Quality: Approvals | Review/release status composition and featured request card | Demo/Unavailable; any example review action is local and clearly labeled. No merge/approve calls. |
| Quality: Hygiene | Quota/coverage chart and metadata status rows | Existing license/description/topic coverage, with denominator. Other checks unavailable or separate Demo. |
| Quality: Guardrails | Policy/safety subcards and state controls | Unavailable or Demo; existing read-only policy boundary remains. |
| Benchmarks: Module allocation | Service/module distribution composition | Demo, no claimed repository architecture measurement. |
| Benchmarks: Release loop | Matching CI flow diagram/node/connector treatments and animation | Demo only; reduced-motion fallback retains meaning. |
| Benchmarks: Workflow runs/latency | Same run history/chart/table hierarchy and status treatment | Demo, no actual benchmark/CI request. |
| Cadence: Sprint/release goals | Goal cards/progress indicators/targets | Demo, no saved planning feature. |
| Cadence: Weekly contributions | Weekday distribution and total/trend treatment | Demo/Unavailable; not inferred from repository update timestamps. |
| Cadence: Retention matrix | Cohort table, heat shading, legend and empty cells | Deterministic Demo, accessible table, no real retention claim. |
| Repository inspector | Matching surface, type hierarchy, badges/metrics/topics/clone/footer | Reuse current safe modal/metadata/copy/open actions and focus restoration. |
| Feedback/empty/error | Matching notice/toast/skeleton/empty visual language | Existing timings and app message workflows remain; do not copy the reference's different dismissal timing. |

## Comparison procedure

Capture reference and implementation at widths 375, 1074 and 1440, same viewport height/DPR/zoom, dark/light, active view and deterministic representative dataset. Wait for bundled fonts before measuring. Freeze clock/request results in tests to prevent unrelated diffs. Save reference/actual region captures and notes under an ignored test artifact directory, with stable names; do not commit bulky screenshot outputs by default.

Measure: 1440px content maximum, reference responsive paddings/gaps, its large-screen 12-column spans, 24px outer card corners, 18px inner-card corners, per-control pill/keycap radii, exact palette/border opacity/font families/weights/line heights, icon sizes and chart series positions/colors. Derive any remaining dimensions from rendered baseline during implementation; this plan does not claim measurements that have not been taken. Corresponding layout bounds should agree within 1 CSS pixel after aligning fixtures; tolerate font rasterization differences, not substituted fonts or geometry.

Check every row in this map; acceptance requires no unexplained visual mismatch. Capture selected/hover/focus tab states separately and assert exact zero corner radius with retained fill. Annotate shell/brand/demo-label/tab differences per appearance contract. Pair whole-page and region reviews so shell adaptation cannot hide a missing widget or reorder.

## Rebuild inventory

Add brand/logo, topbar actions, category row, command tray, help/favorites, view navigation and inspector as separate capture regions. Existing table entries cover interiors, not just outer cards. For each region compare computed properties plus a crop. Capture names use layout-width-theme-view-region. The original baseline paragraph is historical and the latest menu source governs.

## November 18 preview revision
The city represents up to six repositories ranked by known size. Each building uses the existing inspector and keyboard focus behavior.
