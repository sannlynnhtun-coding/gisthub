# Data Model: Google Sheets Sync

Design only; no store or schema has been changed.

## Identity and entities

| Entity | Key and fields | Rules |
|---|---|---|
| Library scope | GitHub numeric user ID; normalized login alias | Obtain numeric ID from authenticated GitHub user; map existing username-keyed records without deleting them. Login rename does not create a new library. |
| Connection | local connectionId; Google permissionId, spreadsheetId, workspaceId, githubUserId; status, lastSuccessfulSyncAt, generation | Immutable identity tuple; labels may change. No tokens. New destination is a new connection. |
| Manifest | format=gisthub-sync, schemaVersion=1, workspaceId UUID, githubUserId, creatorGooglePermissionId | Created once; reject unsupported schema/account mismatch. Tab name alone is not identity. |
| Bookmark | libraryId + gistId; present boolean; position token | Independent membership and position fields; tombstone on removal. Metadata retained without cached gist body. |
| Collection | libraryId + collectionId; displayName, deleted | Stable ID survives rename; deleted collection suppresses assignments without erasing evidence. Legacy normalized names mapped to IDs at confirmed preview. |
| Assignment | libraryId + gistId + collectionId; present | Set membership; deterministic key. |
| Local tag | libraryId + gistId + normalizedTag; displayLabel, present | Derived GitHub hashtags are not outgoing local-tag edits. Legacy indistinguishable tags may be imported only as explicitly previewed local metadata; never alter gist description. |
| Appearance | libraryId + theme/font; choice ID | Each choice independent; active localStorage rendering mirror is not sync authority. Defaults and guest preference remain recoverable. |
| Operation | Body: opId UUID, libraryId, workspaceId, deviceId, entityType, entityId, field, kind, value, parentIds, logicalCounter, optional displayTime; envelope: payloadHash | Immutable allowlisted body; hash is separate and excluded from hash input. Counter/clock never selects concurrent winners. Field edits capture observed field/lifecycle heads; entity lifecycle edits capture all observed entity heads. |
| Pending outbox | connectionId + opId; operation, pending/inFlight/uncertain/acknowledged, retry metadata | Local edit + outbox commit atomically. Retry identical opId/body. Origin tuple never silently changes. |
| Conflict | workspaceId + libraryId + logical field key; current candidate opIds/value/deletion flags | Multiple differing causal heads; user resolution consumes all observed candidates. |
| Import receipt | destination connection, preview digest, source aliases, created opIds, acknowledged set | Prevent repeated initial import; source pending edits retained until acknowledged by confirmed destination. |

## Proposed local persistence

Add scopedMetadata, syncConnections, syncOutbox, syncJournal, syncConflicts and syncImports to the existing GistHubDB in a future version 5 upgrade. Keep profiles, gists and groups intact. Store keys are compound scoped keys; do not overwrite a record using only gist ID or collection name. Journal and causal-head/conflict indexes include workspaceId as well as libraryId; outbox entries additionally retain connectionId. Library metadata and appearance are the active library projection, while retained journals/conflicts for inactive workspaces must not be replayed into that projection without an explicit connection switch and confirmed import. Upgrade is additive and transactional. If another tab blocks the upgrade, preserve data and show a close/retry action.

Metadata mutation, operation creation and outbox enqueue share one readwrite transaction across required stores. Incoming replay commits journal, metadata, conflicts and acknowledgement together without enqueueing an echo operation. Commit events invalidate active views only after transaction completion. Account switch increments a generation; stale async callbacks may acknowledge their captured original connection's outbox but cannot apply that account's data to the new active UI or send new work.

Pre-sync edits remain scoped locally until a confirmed connection/import assigns them a destination. While disconnected, later edits remain in the original connection outbox. Switching destinations creates import operations after preview/confirmation; it never mutates original operation scope. The import receipt retains local source-workspace/candidate provenance and maps each candidate to its destination operation ID; it never copies source parent IDs across workspaces. See contracts/sync-protocol.md for confirmed import and candidate-resolution rules.

## Causal state and deletion

For a field, remove an operation from the candidate heads only when a later valid operation causally descends from it. Equal head values have one visible result while retaining causal identities. Different head values are a conflict; show the last common resolved value if available and label unresolved candidates, rather than silently treating one as final. Resolution references all displayed heads. Concurrent resolution operations with different choices form a new conflict.

parentIds are causal dependencies within the same entity, library and workspace. A field edit records observed heads of that field plus observed lifecycle heads; an entity lifecycle edit records every observed entity head. Dependency edges do not overwrite values of other fields: replay projects causal dominance onto the affected field, and separately detects entity-wide lifecycle conflicts.

Delete is a candidate value, not physical history removal. Entity lifecycle changes carry the complete observed entity context; delete-versus-edit across any field of that entity creates a lifecycle conflict. Assignments to deleted collections remain suppressed; resolving in favor of restoring the collection can reveal retained assignments. Deleted membership does not destroy gist cache content. No tombstone expiry or journal truncation in version 1.

## Ordering

Each bookmark has a fractional lexicographic position token between neighboring visible bookmarks, with stable gist ID as a tie-breaker for equal tokens. Independent item moves merge deterministically; conflicting concurrent positions for the same item require manual choice. Position generation and comparisons must use a single documented ordinal algorithm with property tests, never locale sorting or floating-point averages. If token length reaches the operation size guard, preserve pending work and report capacity; do not silently renumber every bookmark. Reordering never implies gist deletion.

## Validation and limits

- All IDs and account scope must match the selected manifest and connection; parent references must be valid, same scope and cycle-free. Incomplete parent closure prevents claiming complete replay.
- Canonicalization and hashing follow the exact body/envelope rules in contracts/sync-protocol.md: RFC 8785 JCS, deduplicated ordinal-sorted parentIds, UTF-8 without BOM, SHA-256 lowercase hexadecimal. payloadHash is outside the body and excluded from hash input. Duplicate ID + different canonical body is corruption. Hash detects damage, not malicious edits by an authorized owner.
- Labels are plain text with the existing app's validation and normalization. No formulas, HTML or arbitrary property bags enter the transport.
- Per-operation canonical JSON maximum: 20 KiB UTF-8. Maximum batch: 100 rows and 256 KiB encoded request, whichever first. Oversized operations fail visibly before upload and stay local.
- Upload-admission thresholds: 20,000 distinct operations, 10 MiB cumulative canonical body bytes, or 25,000 physical operation rows, whichever is reached first. Read current usage and reject an append whose projected usage exceeds any threshold; at a threshold, pause append requests including retry appends. These are per-client admission checks, not distributed reservations; concurrent overshoot is possible and is not corruption. Continue chunked reads, validation and acknowledgement of already verified remote operations even above thresholds. Preserve unverified pending work and history without truncation; offer explicit new-storage selection and preview/merge. Read resource failures preserve known-good local state and report incomplete reconciliation rather than success.
- Excluded fields: tokens, profiles, gist files/content, layout, tool drafts, other preference categories. Only connection identity stays local; manifest contains only required non-secret scope identity.
