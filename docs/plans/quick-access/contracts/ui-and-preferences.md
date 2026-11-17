# UI and preference contract

1. A ninth tab labelled Quick Access appears after Home and participates in the existing tablist, selected state, arrow/Home/End navigation and collapse panel. Use a stable DOM ID without spaces: workspace-tab-QuickAccess.
2. Every ribbon command, including navigation, tools, Local settings, Appearance and Sound, exposes a separate labelled Add to Quick Access / Remove from Quick Access button. It must not launch or change the command when used. Never nest buttons or place controls inside links.
3. Empty Quick Access explains how to add commands. Added items preserve labels, icons, actions and deployment availability. Their test IDs and popover IDs must be distinct from originals.
4. Quick Access command activation passes its current launcher ref through the same workspace callback or uses the same original navigation/component action. Closing a tool restores focus to that launcher when available, otherwise existing fallback applies.
5. Each pinned item has a labelled drag handle, Remove and Move earlier / Move later controls. Native drops move before the highlighted target. External, invalid, cancelled and self-drops leave state unchanged. Normal clicks continue to activate the command; dragging never does.
6. Changes announce success through a polite live status and preserve usable focus. Storage errors announce failure and retain the last saved order. Controls remain operable on narrow screens and without dragging.
7. Persist only the ordered ID array described in ../data-model.md. Export/import uses the existing local-settings envelope and strict key-specific validation; no new API is introduced. Invalid imports fail before mutations, preserving existing rollback behavior.
8. Preference changes survive reloads and profile switches in the same browser. No cross-device or live cross-tab synchronization is promised.
