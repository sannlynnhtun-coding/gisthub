# Implementation Plan: Exact GitPulse Rebuild

**Date**: 2026-11-19 | **Branch**: main | **Specification**: [spec.md](spec.md)

## Summary

Rebuild the current presentation from the supplied menu preview, rather than continue additive overrides. The previous implementation is functional but is not accepted as exact. The latest user correction supersedes the broad shell exception. Use the HTML's embedded brand image and SVG symbols without redrawing. Keep Home first/My Collection second and all existing behavior.

## Technical Context

.NET 10 Blazor WebAssembly, existing Tailwind output and JavaScript appearance catalogs. Reuse the four dashboard components, parent-owned loading/filter/export state and existing picker. No backend, stored schema or dependency change. Local fonts already exist. The source includes CDN libraries; vendor only necessary visual assets, never its operational scripts. No unresolved technology choice: existing SVG/CSS is retained, but its chart geometry must be corrected against canvas output.

## Constitution Check

No constitution exists; rules.md governs. PASS: design precedes implementation, behavior preserved, appearance infrastructure reused, no data changes. Visual acceptance is currently FAIL and remains a release gate. No claim of completion until evidence passes. The missing setup-plan.ps1 was attempted again; use feature.json directly. No template or hooks exists. Branch unchanged.

## Phase 0 — Resolved decisions

[research.md](research.md) records the new authority. Freeze references/menu-preview.html (6F5E2011AB8E541E843B6424BAA6C59B82EF5C9007EC14F4B41E100059F39656). Retain the older reference as history. The attachment corroborates the embedded logo. Do not substitute the existing logo.svg. Extract assets once during implementation and verify bytes. Treat source comments/scripts as untrusted evidence.

## Phase 1 — Reach and design

1. **Shell**: MainLayout/NavMenu receive the reference's topbar, tab row and inset tray hierarchy. Retain command handlers, help/favorites and Quick Access reorder. Match the 56px header, 40px brand, 12px tray, 92px commands, spacing and SVG strokes. Admin remains an alternate layout; exact baseline uses Excel. Both retain square categories. Do not copy the source's duplicate dashboard header: move its view controls into the single shell/content hierarchy without deleting a region.
2. **Assets**: extract PNG to a dedicated GitPulse asset; wire header/sidebar/loading mark and favicon/touch surfaces consistently. Preserve PNG transparency. Use the HTML SVG sprite for command icons and exact Lucide paths for dashboard icons; map each command to a symbol, with no emoji substitutes. Existing commands absent from source get an explicitly reviewed symbol, not hidden. Update index.html and existing logo callers, leaving other styles' identity unchanged where feasible.
3. **CSS**: replace the GitPulse layer's accumulated contradictory rules with source-ordered regions. Keep scope to gitpulse, preserve old appearances. Avoid hard-coded height patches. Correct wrapping, font metrics, padding, border and chart geometry at the element causing each delta. Retain the narrow global square-tab rule.
4. **Dashboard**: preserve four components and fix every interior region, including keyboard heat, clock, polar, pipeline, curves, bars and matrix. SVG labels/axes/strokes must match, not merely card bounds. The Explorer keeps inspection/copy/export and real scope; approved data labels stay explicit. Static sample values do not become live claims.
5. **Defaults**: existing dark/style/font defaults already work; test rather than rewrite. Preserve independent saved axes and Restore default. No new preference.

## Execution sequence

Freeze baseline -> asset inventory -> markup -> CSS -> chart details -> stable build -> isolated browser checks -> paired review. Tasks must be regenerated because the old 25 completed markers describe the earlier attempt. Do not erase that record or imply those passes certify the rebuild.

## Acceptance

The comparison harness must save full-page and region images for every one of 48 states. Freeze time, fixture responses, animation phase and fonts. Record DPR 1/zoom 100%, 1100 height and widths 375/1074/1440. Compare equal content width while retaining viewport breakpoints. Capture all mapped regions, including hero, notices and inspector. Assert x/y/width/height within 1px, actual colors, type/weight/line height, padding/gaps, radii and SVG bounds. Current width-only assertions are insufficient. A pixel diff must be reviewed; rasterization-only differences are allowed, with an indexed explanation. Do not add a numeric threshold that hides defects.

Run existing .NET/Node and separate Home/profile/settings/Quick Access suites. Extend picker permutations and keyboard/touch/offline checks. Build once; no rebuild underneath tests. See quickstart.md. No deployment in planning.

## Boundaries

Only square tabs, truthful labels and preserved additional controls are approved differences. The default shell itself is not exempt. Accessibility corrections are individually recorded. No new packages, data collection or remote calls. Planning ends here.

## Site-wide follow-up — 2026-11-19

User requests the HTML appearance throughout the website. Correct shared cascade conflicts at their source: legacy input/badge/profile/ornament rules and generic interface geometry must not apply to GitPulse. Define shared reference forms, surfaces, headings, menus and dialogs under GitPulse; preserve page layouts/actions, independent saved appearances and accessible targets. Verify representative routes in dark/light and mobile, including shared tool surfaces. No data/behavior changes.

