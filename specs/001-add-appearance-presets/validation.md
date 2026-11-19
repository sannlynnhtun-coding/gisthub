# Validation and remaining limits

Implemented coordinated BoardUI, Bencho, beUI Pro, and ObsidianUI selections with light/dark modes. Reused the existing BoardUI and beUI Pro IDs, added the other two styles, and retained legacy fontless presets. Added complete font preview/commit and exact-match detection on web and Flutter.

Passed:
- Web build.
- JS interface style, theme palette/contrast, fonts, and editor appearance/sharing validation tests.
- Browser assertions for all eight modes: discovery, coordinated font preview, cancel, commit, persisted selections, and custom font matching (`scripts/test-reference-appearances.js`).
- Flutter appearance tests, including catalog references, font assets, persistence/reset, charcoal palette and capsule button shape.
- Flutter static analysis.
- Desktop tools-page visual inspection of all four styles; narrow-window beUI Pro review with no document horizontal overflow. Actual browser viewport was 502 CSS pixels; a requested 390-pixel outer window was constrained by the browser.

Limits: No signed-in GitHub mutation flows or physical Android device tests were run. Flutter shares palettes, fonts and component geometry, but its native rendering and the web adaptation are not certified pixel-identical to the reference sites. Visual coverage of every page, real device motion/accessibility, and exact reference screenshot comparison remain unverified. The work does not meet an independently measured 100% visual match claim.

During verification, an older browser context cached build asset fingerprints after rebuilding; a fresh isolated context loaded successfully with no console errors. No application cache behavior was changed as part of this appearance work.
