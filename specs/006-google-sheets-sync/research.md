# Research: Google Sheets Sync

**Date**: 2026-11-25. Read-only repository inspection and primary-source research; no runtime proof or live Google setup performed.

## 1. Browser authorization and Google identity

**Decision**: Use Google Identity Services token model from a user gesture, scope drive.file, and Drive about.get user.permissionId as the stable Google account key (verify returned field during integration). Display email/name only as labels. Do not infer identity from typed email or trust a remembered account hint. Abort connection if stable identity cannot be established. Keep tokens in memory, never in IndexedDB/localStorage/sheets/backups/logs. On expiry show Reconnect; do not launch unsolicited popup loops.

**Rationale**: Fits static Blazor deployment and user-confirmed app-open synchronization. The browser model does not provide unattended refresh-token behavior.

**Alternatives**: C# desktop quickstart credential files do not fit a downloadable browser app. Backend authorization-code flow would support server token retention but adds unrequested infrastructure. Service-account private keys in WASM are rejected.

Sources: [Token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [authorization models](https://developers.google.com/identity/oauth2/web/guides/choose-authorization-model), [Drive about.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/about/get), [Drive User resource](https://developers.google.com/workspace/drive/api/reference/rest/v3/User).

## 2. Select one private app-managed file

**Decision**: Create with Sheets spreadsheets.create and initialize manifest/journal in one schema batch; reconnect with Google Picker (spreadsheet view). Picker grants access to the selected file under drive.file. Validate owner, format, workspace ID and GitHub scope before binding. A partially initialized file is not a valid workspace; offer explicit setup recovery, never merge automatically. Use one file per GitHub library for version 1. Identity is file ID plus manifest workspace ID, never its display name.

**Rationale**: Narrow file access, explicit joining and fewer account-mixing hazards. Private is the default; do not automatically grant sharing permissions. Decline shared/non-owned storage for this personal version.

**Alternatives**: Broad spreadsheets/all-Drive scopes are unnecessary. A pasted file ID alone does not grant drive.file access; Picker is the supported join path.

Sources: [Sheets scopes](https://developers.google.com/workspace/sheets/api/scopes), [Picker integration](https://developers.google.com/workspace/drive/picker/guides/web-picker), [create spreadsheet](https://developers.google.com/workspace/sheets/api/guides/create).

## 3. Concurrent changes and unknown write outcomes

**Decision**: Use a dedicated append-only journal with stable operation IDs, payload hashes and causal parent IDs. Append complete operation rows; replay is set-based and independent of row order. Read back before acknowledgement; timeout leaves an uncertain operation pending until its ID/hash is found. Retry may append duplicate rows with the same immutable ID; replay deduplicates. Never replace the journal with a locally calculated snapshot.

**Rationale**: Google documents atomic updates but warns collaborator edits can alter results. It does not provide a documented client compare-and-swap transaction for this workflow. The append transport must pass a live concurrency test before shipping; this plan does not assert undocumented linearizability or exactly-once writes.

**Alternatives**: Last-write-wins spreadsheet rows lose concurrent changes; timestamp winners violate confirmed manual conflict resolution. A shared lock cell is not a safe distributed lock. Apps Script/backend serialization changes deployment scope and is deferred unless the transport gate fails.

Sources: [append](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/append), [batchUpdate caveat](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate), [limits and atomicity](https://developers.google.com/workspace/sheets/api/limits).

## 4. Deterministic merge and identity

**Decision**: Per-account bookmarks key by gist ID; assignment by gist ID + collection ID; local tags by normalized label and gist ID; existing name-only collections receive stable derived identities from the existing name normalizer during confirmed initial import. Keep display names separately; imported names that normalize to the same key appear once in preview. Existing remote collection IDs take precedence through explicit alias mapping, not guessed rename matching. New collections use random UUIDs. Same-ID copies merge; distinct IDs with the same normalized name require an explicit preview alias choice before import, avoiding silent collapse of genuinely distinct collections.

**Rationale**: IDs remain stable after renaming. Independent fields merge; concurrent differing values on the same logical field become multi-value conflicts. Identical concurrent values collapse to one logical result. Resolve operations reference all candidates seen by the user; unseen edits can cause a new conflict.

**Alternatives**: Whole-record conflict granularity blocks unrelated changes. Row position, display name alone after creation and device clock are unsuitable permanent identities.

## 5. Existing storage integration

**Decision**: Plan an additive GistHubDB version 5 upgrade with scoped metadata, connection registry, outbox, replay journal and conflicts. Change nothing during planning. Future user edit + pending operation commit in one transaction; broadcast only after commit. Existing profiles and gist bodies stay intact. Theme/font become per-account IndexedDB records with existing localStorage keys as active rendering mirrors. Snapshot prior local appearance as a recoverable legacy preference; do not upload it automatically to every profile. New-account defaults and initial appearance import must be visible in merge preview.

**Rationale**: Current JS stores version 4 and current groups lack account ownership; theme/font are currently global. Existing group membership/name migration must not assume ownership for all profiles. Preview proposed collections for the active library; unassigned legacy groups remain local until explicitly associated. Local tags must remain distinct from GitHub-description-derived tags; removing a parsed hashtag must not silently edit a gist.

**Alternatives**: Separate metadata/outbox databases cannot offer a single atomic transaction with existing stores. Bulk exporting LocalGist risks sending gist bodies/credentials and loses missing-gist metadata.

## 6. Recovery, requests and retention

**Decision**: One active coordinator per connection per browser context, serialize local commits across tabs through IndexedDB, cancel/generation-check in-flight callbacks on account switch. Batch after a 2-second edit debounce; coalesce foreground/manual triggers. Check authorization before scheduling; no closed-app worker. Use jittered exponential backoff for quota/transient failures; respect Retry-After. Bound requests to at most one in flight per file per coordinator and about one per second locally; project-wide quotas still apply across devices. Keep entire causal history and deletion evidence in version 1, pause new append requests at the documented per-client upload-admission thresholds. These are not distributed reservations; concurrent overshoot is valid retained history, which remains readable and acknowledgeable. Disconnect prevents new dispatch but cannot retract an already dispatched request; late acknowledgements remain scoped to its original tuple.

**Rationale**: Tombstone expiry with indefinitely offline devices can resurrect deleted data. Deleting history safely requires an explicit device retirement/checkpoint protocol outside this release. Unknown write outcomes are recoverable, not assumed failure.

**Alternatives**: Blind retries with fresh IDs duplicate logical edits. Destructive compaction and infinite rapid retry are rejected.

Sources: [usage limits](https://developers.google.com/workspace/sheets/api/limits), [error guidance](https://developers.google.com/workspace/sheets/api/troubleshoot-api-errors).

## 7. Approved documentation corrections

**Decision**: Separate the operation body from payloadHash and use RFC 8785 JCS plus SHA-256 over canonical UTF-8 body bytes. Deduplicate/sort parentIds before canonicalization; displayTime is immutable and omitted if absent. Share serializer and complete-operation vectors across C#/JavaScript. Source: [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785).

**Rationale**: A self-containing digest is undefined; a specified canonical byte representation prevents serializer differences from becoming false corruption.

**Alternatives**: Hashing payloadHash itself or unspecified default serializer output is rejected.

**Decision**: Initial merge preserves differing candidates; only explicit choices resolve them. Destination import uses independent candidate roots with receipt-based stable IDs, local source provenance and no cross-workspace parent IDs. Journal/head/conflict indexes include workspace scope. US1 owns initial conflict UI and generic appearance candidate persistence; US2/US4 extend those boundaries.

**Rationale**: Preview observation is not causal user intent to overwrite another value. Separate workspaces cannot share a parent graph by accident. A reviewable US1 must not depend on later story implementation.

**Alternatives**: Making every imported candidate descend from all observed destination heads would silently choose a winner. Copying source history directly breaks workspace isolation.

**Decision**: Append parent-first closed batches; verify a batch before dependent later requests. At/above capacity pause appends including retries, while valid reads and acknowledgement continue. Threshold overshoot is not corruption; resource-limited reads remain incomplete rather than successful.

**Rationale**: An interrupted multi-batch upload must not strand a child without its parents. Local admission cannot reserve global capacity across devices, and committed data must not become unreadable at a soft threshold.

**Alternatives**: Unordered split uploads, strict global-capacity claims and truncating retained history are rejected.

## Research outcome

No NEEDS CLARIFICATION remains for product scope. Verify stable Google identity, real append concurrency, mobile popup behavior and capacity/performance in implementation validation. These are explicit release gates, not completed tests or reasons to change app code during planning.
