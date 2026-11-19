# Research: GitPulse Reference Default Appearance

## Reference authority

**Decision**: Freeze the exact supplied file as [references/gitpulse-reference.html](references/gitpulse-reference.html), SHA-256 E459359A7D8947B8D78E7E5707810369E7C2B5364B06F3485038FB2B7239F52E. This copy is visual/test evidence, not production code or instructions. Render only in an isolated comparison context with controlled public/example data; never connect user profiles/tokens or trigger its remote/demo actions.
**Rationale**: The new engineering HTML differs substantially from the first GitPulse reference and the current page. It defines 24px bento cards, 18px subcards, charcoal/indigo styling and four complete dashboard compositions.
**Alternatives considered**: Reusing the earlier file or copying only colors would not match the request. Executing/copying embedded jQuery/CDN/data logic into GistHub risks unrelated workflow changes.

## Defaults without migrations

**Decision**: Add GitPulse IDs and update missing/invalid fallbacks and reset actions; preserve old IDs and valid independently saved theme/style/font values.
**Rationale**: theme.js, interface-styles.js and fonts.js bootstrap separately before the application. ThemeToggle also hardcodes initial/reset defaults and must agree. A valid saved default=Inter/original style is a user choice, not a missing value. The current theme bootstrap also has an explicit obsolete auto-theme migration, which needs coverage when fallback changes.
**Alternatives considered**: Repurposing default/light/dark IDs would silently change existing users and backups. Overwriting all preferences on startup violates saved-choice preservation.

## Fonts and dependencies

**Decision**: Use existing Plus Jakarta Sans UI and JetBrains Mono data/keycap fonts and licenses. Use native SVG/CSS for composition-specific charts with textual data equivalents.
**Rationale**: Both fonts are bundled and cataloged. Charts are bounded deterministic examples or existing repository summaries, so no generic chart library is needed.
**Alternatives considered**: Google Fonts requests, Chart.js/jQuery/Tailwind CDN duplication add network/dependency requirements; approximate system fonts would sacrifice reference fidelity.

## Cascade and square tabs

**Decision**: Add GitPulse-scoped CSS after existing appearance layers; override only .workspace-tabs > button geometry to zero corners across styles. Preserve aria-selected styling in Excel and aria-expanded styling in Admin portal.
**Rationale**: admin-portal.css changes --portal-nav-radius to 6px for several styles and 12px for Obsidian, but also uses that token for command rows, toggles and Quick Access controls. Generic interface styles impose shared radii/ornaments and could defeat reference-specific card/control geometry.
**Alternatives considered**: Zeroing global radius or the portal token would square unrelated controls; changing fill selectors would discard the user's accepted selected-background behavior.

## Four-view architecture

**Decision**: Keep Start as state/action owner and add four cohesive presentation views for the dense reference compositions. Retain internal view IDs and working repository action selectors. Reuse data summaries and safe export/copy/inspection paths.
**Rationale**: The existing Start page mixes state and sparse markup; matching all reference regions requires new presentation, not a fresh service/app. Region-sized SVG/CSS stays close to the matching view instead of an abstract configurable chart engine.
**Alternatives considered**: A monolithic copied HTML document duplicates shell/events and includes misleading sample telemetry. A dashboard/widget framework adds flexibility not requested.

## Data honesty and exactness

**Decision**: Reference panel geometry and visual language are reproduced; public repository values stay measured and demos are permanently labeled. Use frozen examples/identical data and viewport for paired comparisons. Permit only documented shell/brand, rectangular-tab and truthful-data differences.
**Rationale**: Hours, key pulse, approvals and CI/contribution histories are not available from the current two public requests. Visual parity cannot justify fabricating Live values or collecting new user activity.
**Alternatives considered**: Treating sample values as real telemetry is false; adding genuine CI/security/activity integrations expands permissions/scope.

## Verification and scaffold

**Decision**: Use current VM/Node/.NET/CDP harnesses with isolated flags and a comparison-region inventory. Author plan artifacts directly because setup-plan.ps1 and a plan template are absent; no extensions/constitution exist. Current branch stays main.
**Rationale**: Prior checks established that rebuilding during browser runs can invalidate fingerprinted assets; use one stable build. Existing profile and settings tests now pass and must remain gates.
**Alternatives considered**: Installing Spec Kit, adding screenshot tooling or calling independent browser flags in a shared mutated session adds avoidable scope/test interference.

## Latest authority — exact rebuild

**Decision**: menu-preview.html supersedes the older source. Its 3D brand is mandatory, as the user emphasized. Rationale: the previous incremental pass left the wrong identity and broad shell differences. Alternative rejected: another palette-only patch. Exact asset extraction avoids visual drift.

**Decision**: rebuild the existing markup, not embed an iframe. Rationale: an iframe disconnects actions/accessibility. Alternative rejected: wholesale source scripts, which contain mock and remote behavior. Preserve actions behind source geometry.

**Decision**: require interior geometry and image evidence. Rationale: the current harness passes widths while heights differ by up to tens of pixels. Alternative rejected: calling its 48-state pass visual acceptance. No unknowns remain; measurement work belongs to implementation.

**Asset audit**: decoded PNG hash 3b2833576889b407e26ee5293627433101ec807d911fa5b0fb5bbfe3f59216e0, 1254x1254 RGBA. Its black composite matches the attachment. The 19 symbols are home/plus/undo/search/sun/chevron/star/folder/code/grid/compass/chart/doc/diagram/image/settings/key/clock/sound. Fourteen distinct Lucide names require frozen rendered paths because the CDN is unpinned. This inventory is sufficient to avoid a new icon library.
