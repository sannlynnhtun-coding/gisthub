# Feature Specification: Google Sheets Sync

**Created**: 2026-11-25
**Status**: Clarified — ready for planning; implementation not authorized
**Input**: Synchronize bookmarks, collections, tags, theme and font across devices using IndexedDB and Google Sheets. Edit only in the app; keep workspace layout per device. Do not change application code or databases during specification.

## Decision

Retain the local workspace for immediate and offline use. Add optional Google Sheets sync storage for personal library metadata and theme/font preferences. Google Sheets is app-managed storage, not an editing interface. Workspace layout remains device-local. The first release covers the existing website/PWA on desktop and mobile browsers; Flutter Web and Android are excluded. This document authorizes specification work only.

## Clarifications

### Session 2026-11-25

- Q: How should incompatible concurrent edits be resolved? → A: Keep both candidate values and let the user choose in the app; unrelated data continues syncing (Option A).

- Q: Which clients are included in the first release? → A: The existing Blazor website/PWA on desktop and mobile browsers only; Flutter Web and Android are excluded (Option A).

- Q: How are theme and font scoped when using multiple GitHub accounts? → A: Keep theme and font separate per GitHub account and synchronize only across devices using that same account (Option A).

- Q: How should first connection handle existing local and remote data? → A: Preview and confirm a merge of both sides without duplicate records; resolve incompatible values using the confirmed manual conflict flow (Option A).

- Q: What happens to pending changes after disconnecting sync? → A: Keep local data and pending changes tied to the original Google account, sync file and GitHub account. Resume for that same connection; require preview and confirmation before merging into a different connection (Option A).

## User Scenarios & Testing

### User Story 1 — Connect personal sync storage (Priority: P1)

As a signed-in user, I can connect my Google account and create or select my personal sync spreadsheet so another device can join the same workspace.

**Independent test**: Connect on two clean browser profiles and select the same sync file.

**Acceptance scenarios**:
1. Given no existing sync file, when I connect and choose Create, a private sync file is created in my Google account and its connection is shown.
2. Given an existing sync file, when I connect another device and select that file, the app identifies the linked library without creating a duplicate file.
3. Given existing local and remote metadata, when connecting for the first time, I see additions, overlaps and conflicts in a merge preview and confirm before either side is changed; independent records from both sides are retained without duplicates and incompatible values use manual resolution.
4. Given consent is denied, the app remains usable locally and does not report successful sync.

### User Story 2 — Continue work across devices (Priority: P1)

As a user, I can change bookmarks, collections, assignments and local tags on one device and retrieve them on another.

**Independent test**: Add, edit, reorder and remove library metadata on device A, sync, then sync device B and compare results.

**Acceptance scenarios**:
1. Local edits are saved locally before remote acknowledgement and remain marked pending until confirmed remotely.
2. Independent edits on two devices are merged without losing either edit or duplicating records.
3. A deletion synchronized from one device is not resurrected by stale data from another.
4. Bookmark ordering and collection membership survive sync and repeated sync produces no duplicates.
5. Given a concurrent collection rename, both names are retained and the user chooses one in the app while unrelated records continue syncing. The resolved choice propagates on subsequent successful sync without recreating the conflict absent a new edit.
6. A referenced gist missing from a device's cache retains its metadata without creating or modifying a GitHub gist; it becomes usable once the gist is available.

### User Story 3 — Work offline and recover (Priority: P1)

As a user, I can keep organizing offline and understand when changes still need synchronization.

**Independent test**: Edit while offline, reload, reconnect and retry sync.

**Acceptance scenarios**:
1. Pending changes survive reload and are sent when connectivity and authorization permit.
2. Interrupted or repeated requests do not lose changes or create duplicate records.
3. Expired or revoked authorization shows a reconnect action while local edits remain available.
4. Given pending edits, when I disconnect and reload, local data and pending edits remain bound to the original Google account, sync file and GitHub account; disconnect prevents dispatch of new remote requests and cancels in-flight requests where possible. A request dispatched before disconnect may still complete remotely; its outcome remains associated with the original connection and is reconciled on reconnect.
5. Reconnecting the same connection resumes pending work when authorized. Selecting a different connection never automatically redirects pending changes; the app previews the proposed merge and requires confirmation, retaining the original pending changes until the new destination acknowledges confirmed edits.
6. Sync status distinguishes synchronized, pending, offline, reconnect required, failed and unresolved conflict states, with a last-success time.

### User Story 4 — Share appearance while retaining device layout (Priority: P2)

As a user, my theme and font follow me while each device keeps its own workspace layout.

**Independent test**: Give two devices different layouts, change theme/font on one, then sync both.

**Acceptance scenarios**:
1. Theme and font propagate to the other device after successful sync.
2. Neither device's workspace layout changes during initial merge or subsequent sync.
3. Other settings are unchanged by this feature.
4. Given accounts A and B have different theme/font choices, changing A and synchronizing does not alter B; switching accounts restores the selected account's saved appearance. An account without saved choices uses the existing app defaults.

### Edge Cases

- Two devices change the same value or reorder the same bookmarks before syncing: detect incompatible concurrent edits, retain both candidates and surface a resolution action. The user chooses the winning value in the app while unrelated data continues syncing.
- A deletion races with an edit: do not silently discard the edited candidate; require resolution before declaring that item synchronized.
- Sync storage is deleted, inaccessible, malformed or manually edited: preserve local data, show an actionable error and do not silently recreate or overwrite remote storage.
- Interrupted writes, duplicate retries and stale reads must not result in acknowledged local edits disappearing.
- Account switching must never upload another GitHub profile's metadata or pending changes to the new connection.
- Unavailable theme/font on another supported device retains the saved choice and displays an available fallback.
- Capacity thresholds pause new uploads without deleting history or local pending work. Concurrent uploads may exceed a threshold; valid committed data remains readable and acknowledgeable, and the app offers explicit new-storage selection with preview/merge.
- Sync actions and status must be keyboard accessible and have text labels independent of color.

## Requirements

### Functional Requirements

- **FR-001**: Sync MUST be optional; existing local-only and GitHub workflows remain usable without Google authorization.
- **FR-002**: Users MUST be able to connect Google, create or select a private sync file, reconnect authorization and disconnect through the app.
- **FR-003**: Other devices MUST be able to explicitly join the same sync file; matching file names alone MUST NOT establish identity.
- **FR-004**: Sync MUST include bookmark membership/order, collections, collection assignments and local tags, including renames and deletions.
- **FR-005**: Sync MUST include theme and font only among appearance/settings preferences, scoped separately to each GitHub account; only devices using that same account share those choices. Workspace layout and all other settings remain device-local in this version.
- **FR-006**: Included data MUST remain available locally through IndexedDB. Existing local preferences MUST be preserved during any future storage transition; implementation and migration are outside this specification task.
- **FR-007**: Accepted app edits MUST be durable locally before attempting remote sync; unacknowledged changes MUST remain pending across reloads.
- **FR-008**: The app MUST attempt sync on opening, returning to the foreground and after edits when online and authorized, and offer Sync now. Closed-app background sync is not required.
- **FR-009**: Initial connection MUST preview additions, overlaps and conflicts and require confirmation before merging existing local and remote data. Both sides MUST contribute independent records without duplicates; incompatible values MUST use the manual conflict flow. Initial setup MUST NOT offer replacement of either side as an alternative to this merge.
- **FR-010**: Sync MUST merge independent edits, avoid duplicates on retries and propagate deletions without stale-device resurrection.
- **FR-011**: Incompatible concurrent edits MUST remain recoverable and visibly unresolved until resolved in the app; device wall-clock time alone MUST NOT decide which edit survives. Both candidate values MUST be retained for the user to choose in the app; unrelated data MUST continue syncing while the item remains unresolved.
- **FR-012**: Users MUST see current sync status, last successful sync time and retry/reconnect actions appropriate to the failure.
- **FR-013**: Library metadata and pending changes MUST be isolated by GitHub account and selected Google sync connection. Changing either MUST NOT silently mix libraries.
- **FR-014**: GitHub credentials, Google credentials, account profiles, gist contents, tool drafts and unrelated device preferences MUST NOT be written to the sync spreadsheet.
- **FR-015**: Disconnect MUST stop dispatching new remote requests, cancel in-flight requests where possible and retain local data, the remote file and pending changes bound to the original Google account, sync file and GitHub account. Reconnecting that same connection MUST resume pending work when authorized. A different connection MUST NOT receive those changes without a merge preview and explicit confirmation; the original pending changes MUST remain recoverable until the new destination acknowledges confirmed edits. A request dispatched before disconnect may still complete remotely. A late response may update acknowledgement state for its captured original connection only; it MUST NOT restart synchronization, dispatch follow-up requests or apply another account's data to the active UI. Uncertain outcomes remain pending for reconnect reconciliation. Deleting cloud data is outside this version.
- **FR-016**: All supported edits MUST originate in the app. Direct spreadsheet editing is unsupported and MUST NOT silently corrupt the local workspace.
- **FR-017**: Sync MUST NOT create, edit or delete GitHub gists. Missing gist references MUST retain their metadata until the gist becomes available or the user removes the reference.
- **FR-018**: Failures, rejected permission and unavailable storage MUST preserve local data and pending edits and MUST NOT display a false synchronized state.

### Key Entities

- **Sync Connection**: Authorized Google identity, selected sync file identity and active GitHub library association; separate from GitHub login credentials.
- **Library Metadata**: Account-scoped bookmark references and ordering, collections, assignments and local tags with stable identities.
- **Shared Appearance Preferences**: Theme and font choices scoped to an individual GitHub account and synchronized across devices using that account. Switching accounts applies the selected account's saved choices without overwriting another account's preferences. An account with no saved choices uses the existing app defaults until the user changes them.
- **Device Preferences**: Workspace layout and excluded settings retained only on the current device.
- **Pending Change**: A durable unsynchronized local edit with identity, affected item, acknowledgement state and original connection identity (Google account, sync file and GitHub account), retained across disconnects and reloads.
- **Deletion Record**: Evidence that an item was removed so an offline device cannot restore it inadvertently.
- **Conflict**: Concurrent incompatible candidate changes requiring an explicit resolution outcome.

## Success Criteria

- **SC-001**: A user can connect two supported browser devices to the same workspace and retrieve saved metadata within five minutes, excluding Google sign-in and consent delays.
- **SC-002**: For a test library of 1,000 bookmarks, 100 collections and 500 tag assignments, a single normal edit is visible on a second active device within 30 seconds after that device requests sync, with valid authorization and a stable connection and no service throttling.
- **SC-003**: All edits in the offline/reload/reconnect acceptance scenarios survive and converge after successful synchronization or explicit conflict resolution.
- **SC-004**: Repeating a successful sync three times creates zero duplicate records and restores zero deleted records.
- **SC-005**: Theme/font match after successful sync while both devices retain 100% of their prior layout and excluded settings choices.
- **SC-006**: Account-switching tests expose or upload zero metadata records from an unrelated GitHub library, and synced files contain zero credential or gist-content fields.
- **SC-007**: Every tested failure presents an accurate status and a recovery action without loss of acknowledged local edits.

## Assumptions and Dependencies

- Initial delivery targets the existing Blazor website/PWA across supported desktop and mobile browsers. Flutter Web and Flutter Android are explicitly excluded from this release.
- Users have a Google account and grant access to the app-managed sync file; Google service availability, permissions and limits affect sync completion.
- Developer Google app registration and allowed website setup are prerequisites for delivery; users do not each create a developer project.
- Users use the same Google account, sync file and GitHub profile to access the same library on another device. Multi-person collaboration and shared-file team editing are out of scope.
- The Google file remains private unless its owner changes sharing externally; public sharing is not required.
- No always-running closed-app sync, direct spreadsheet editing, full gist-content backup or synchronization of all settings is included.
- Theme and font are separate per GitHub account; guest appearance stays device-local and is not automatically imported into a signed-in account.
