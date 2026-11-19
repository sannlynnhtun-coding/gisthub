# Appearance design decision

2026-11-17: Match the four reference design languages closely, retaining existing workflows. Reviewed rendered homepages and computed fonts in Chrome. Pixel identity with different content/layout cannot be claimed.

| Reference | Observed treatment |
| --- | --- |
| BoardUI | Inter, white/light gray, blue accent, nested rounded panels, inset highlights |
| Bencho | #0a0a0a canvas, #171717 rounded panels, white capsule actions, Inter body/Plus Jakarta Sans headings, soft press feedback |
| beUI Pro | Geist, #151515 shell, warm terracotta/cream gradient, translucent panels, white capsule actions |
| ObsidianUI | Inter body, Geist actions, black canvas, graphite panels, fine borders, metallic controls, gradient headings |

Reuse boardui and kit-beui-pro IDs. Add kit-bencho and kit-obsidian styles and paired palettes. Presets coordinate fonts; previews and exact-match checks include fonts. Preserve old fontless presets and individual font customization.

Coverage: web catalogs, picker, shared shell/cards/forms/tables/dialogs/menus/notifications/editor chrome, persistence/sharing/backup; Flutter catalog generation, preset selection and global theme. Preserve routes, control order, drafts, contents, and independent output formatting.

Checks: JS theme/style/font tests and coordinated-preset assertions, web build, Flutter appearance tests/analyze, rendered desktop/narrow-screen review. Reuse local licensed fonts. Alternate light modes for dark-first references are adaptations.
