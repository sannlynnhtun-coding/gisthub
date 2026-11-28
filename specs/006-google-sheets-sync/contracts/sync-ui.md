# Sync UI Contract

Add Google Sheets sync controls to existing Local settings; retain existing backup/restore and appearance picker workflows. No separate layout/navigation redesign.

## Connection and states

- Show active GitHub library, connected Google account label, selected file, last-success time, pending count and conflict count.
- Actions: Connect Google, Create sync storage, Select existing storage (Picker), Preview merge, Confirm merge, Cancel, Sync now, Reconnect, Disconnect and Resolve conflicts.
- States: not connected, connecting, preview required, syncing, synchronized, pending, offline, reconnect required, failed and conflicts. Connection/auth/transport state is separate from pending/conflict counts so one cannot hide another.
- On token loss, remain locally editable; do not imply durable browser-stored sign-in tokens.
- Disconnect explains that local work and the remote file remain and pending changes retain their origin. Different-account/file selection always previews a new merge. Disconnect dispatches no new requests; already dispatched requests may complete only for their captured original connection. A late callback cannot restart sync or change another active account.

## Preview

Show additions from each side, duplicate identities, collection alias choices, missing gist references and conflicts. Show theme/font per account and state explicitly that layout stays on this device. Merge confirmation does not choose a conflict winner; explicit candidate choices are separate. Initial conflict choices are implemented in US1 and reused for ongoing conflicts in US2. US1 persists imported theme/font candidates generically; US4 integrates their live application and picker behavior. Only Confirm starts merge import; Cancel retains original state. Revalidate changed preview input before confirmation is applied.

## Conflict resolution

Each item names the collection/bookmark/tag/preference, displays candidate values or deletion, and identifies source devices when available. Choose a value and confirm. Unrelated items continue syncing; a conflict cannot be reported as fully synchronized. If a new candidate appears while resolving, refresh before accepting that resolution. Competing resolutions can produce another visible conflict.

## Appearance and accessibility

Theme/font remain in the existing picker. Changes are scoped to the active GitHub account; switch restores its saved choices. LocalStorage only mirrors the currently active account for existing rendering. Guest values stay local. No local layout key enters outgoing DTOs. Preserve existing system/default theme semantics: syncing a system preference does not force identical effective light/dark mode on different OS settings.

All actions have keyboard focus, explicit text labels and announced status/error updates; color is supplementary. Reuse existing confirmation patterns and equal padding-block for any future controls. Status/diagnostics never expose tokens or gist content.

## Upload capacity

Show an upload-paused capacity state separately from read/acknowledgement progress and pending/conflict counts. Concurrent threshold overshoot is not corruption. Keep valid history readable, retain pending work and offer explicit selection/creation of new storage followed by preview/merge; never replace or truncate a file automatically. A resource-limited read reports incomplete reconciliation rather than synchronized.
