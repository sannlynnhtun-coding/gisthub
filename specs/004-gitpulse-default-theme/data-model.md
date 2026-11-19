# Data Model: GitPulse Reference Default Appearance

## Appearance catalog records

- Theme: unique existing-format ID, name, dark flag, browser chrome and semantic palette roles. Add gitpulse-dark/light; dark canvas #0E0F12, card #17181C, elevated #1E2025, primary text #F5F6F8, secondary #8E939E, hairline white at 7%; light canvas #F3F4F8, card #FFFFFF, elevated #F8FAFC, primary text #0F172A, secondary #64748B, hairline dark slate at 8%. Match individual reference accents and interactive states, not a single universal primary color.
- Style: gitpulse; owns typography hierarchy, undecorated canvas, card/subcard/pill geometry, density, borders, shadows and layout presentation. Keep original default ID and every previous style.
- Preset: gitpulse-dark and gitpulse-light; references style gitpulse, corresponding theme, existing font plus-jakarta-sans. Data/keycap text uses existing JetBrains Mono treatment.
- Preference selection: existing independent keys theme, gisthub:theme-choice, gisthub:interface-style, gisthub:font. IDs retain existing bounds/validation. No new key, version or data migration.

## Selection transitions

Boot: for each dimension, valid stored ID -> retain; missing/invalid -> its new default. System light preference does not override the fresh-session dark default. Existing obsolete-auto-theme exception remains documented/tested. Blocked storage -> same in-memory usable defaults without claiming persistence.

Preview -> temporary selected dimension; Escape/close without commit -> exact prior dimensions. Select preset -> commit coordinated theme/style/font. Select individual dimension -> preserve other dimensions. Reset style -> gitpulse only. Restore default -> gitpulse-dark + gitpulse + plus-jakarta-sans. Backup restore -> existing validation/merge/reload behavior, respecting the restored valid IDs.

## Workspace tab state

Existing category, selected/expanded, hover and focus semantics remain. Geometry: four zero-radius corners for workspace category buttons in all states/styles/layouts. Selected background remains controlled by the existing state/theme rules. Do not reuse this geometry for cards, command rows, dialogs or Quick Access star/reorder controls.

## Dashboard panel and data provenance

No new stored business entity. Four views own fixed region markup/example series. Each panel identifies measured public repository data, unavailable data or Demo. Existing loaded developer/repository result, revision protection, 100-row scope, filtering, sorting and inspector selection remain page-owned.

Examples: hours ring/weekly segments; keyboard heat map/keycaps and week/month demo selection; approvals/status rows; module distribution; CI flow nodes/runs; sprint goal meters; contribution histogram; cohort matrix. Values are deterministic and bounded, not sampled from real keyboard activity or derived as real telemetry. New local example interactions do not persist or send requests.

## Visual comparison record

Reference hash/path, viewport width/height (375/1074/1440 width), DPR/zoom, light/dark mode, shell layout, active view, data fixture identity, interaction state, fonts loaded, region IDs, computed measurements, screenshot paths and intentional-difference notes. No live username/time changes in deterministic visual comparisons. Never export comparison fixtures or demo values in measured repository CSV.

## Asset identity

ReferenceAsset has source selector, media type, byte hash, destination and callers. The PNG and SVG symbols are immutable source assets. Compare decoded PNG hash, not base64 text. A command-to-symbol table records every visible action. No stored entity is added.

ComparisonRecord adds region bounds (including x/y), typography, gaps/padding, image hashes and per-state screenshot names. Every region has a review result; an absent result cannot be PASS. State transitions include tab selected -> hover -> focus, picker preview -> Escape, and demo control -> local feedback.

## November 18 preview revision
Repository size is nullable and comes from the existing GitHub response. There is no persisted city state.
