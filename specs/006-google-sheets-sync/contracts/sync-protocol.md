# Sync Protocol Contract — Version 1

## Remote file

One personal spreadsheet per GitHub library. Required tabs: Manifest and Operations. Manifest is a fixed key/value table containing the fields in data-model.md; Operations is a contiguous table with header `opId | payloadHash | payloadJson`. Each operation occupies one complete row. User data is JSON text written with RAW, never USER_ENTERED. No client calculates the next row index.

External interfaces: Google Identity Services token callback, Drive about.get (stable account identity), Picker file selection, Drive files.get (ownership/type/access), Sheets spreadsheets.create, spreadsheets.batchUpdate (schema initialization only), values.get/batchGet and values.append. No new backend endpoint or GitHub write endpoint.

Append target: `POST /v4/spreadsheets/{id}/values/Operations!A:C:append` with `valueInputOption=RAW`, `insertDataOption=INSERT_ROWS` and rows in the request body. URL-encode the range component. Authorization header is never included in persisted request logging.

## Operation envelope

An operation has a body and a separate payloadHash. Required body fields are opId, libraryId, workspaceId, deviceId, entityType, entityId, field, kind, value, parentIds and logicalCounter. displayTime is optional and omitted when absent. It is immutable when present. Identifiers and logicalCounter are strings to avoid numeric precision loss. kind is set, delete or resolve; delete carries value=null. Unknown properties, duplicate JSON property names and invalid Unicode are rejected.

Before canonicalization, parentIds are deduplicated and sorted ordinally. Serialize the body using [RFC 8785 JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785), encode as UTF-8 without BOM and compute SHA-256. payloadHash is the lowercase hexadecimal digest. payloadHash is not a body property and MUST NOT be included in hash input. payloadJson is exactly the canonical body. The Operations row is [body.opId, payloadHash, payloadJson]; its opId column MUST match body.opId.

Serializer fixture {"b":2,"a":1} canonicalizes to {"a":1,"b":2}, with SHA-256 `43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777`. This is a serializer fixture, not a valid operation envelope; implementation tests must also include valid complete operations and Unicode/escaping cases shared by C# and JavaScript.

Duplicate opId with the same canonical body has one logical effect. Duplicate opId with a different canonical body is corruption. Hash verification detects damage; it does not authenticate the spreadsheet owner.

Mutation is field-granular. Field edits reference observed field and lifecycle heads; lifecycle changes reference all observed entity heads within the same entity/library/workspace. Other field values are not overwritten merely by being causal dependencies. Delete-versus-edit across fields is an entity lifecycle conflict. A resolve operation consumes only candidates explicitly shown and chosen by the user; a replacement value must satisfy existing field validation. Missing dependencies postpone replay, not imply a newer winner. Schema version is fixed by the manifest.

## Sync cycle

1. Capture immutable connection identity/generation; verify active GitHub identity and in-memory Google identity match. Serialize local cycles; coalesce triggers.
2. Read/validate manifest and the complete journal in resource-bounded chunks, including header, duplicate IDs, hashes and parent closure. Upload thresholds are not read cutoffs. If dependencies appear missing, perform a bounded complete re-read before reporting integrity failure. Never apply an incomplete graph, fabricate parents or declare complete reconciliation. Persistent failure retains known-good local state; do not upload into malformed or wrong-scope storage.
3. Union remote operations only with the local journal for the captured destination workspace and library; retained source-workspace operations are not members of this union. Replay deterministic causal state and commit incoming records and conflicts atomically. Concurrent unseen edits may be found in a later cycle.
4. Identify pending operations for exactly the captured connection. Order them topologically by causal dependency. Dispatch an operation only if every parent is verified in the destination journal or included earlier in the same atomic append request. Each appended batch must leave a causally closed journal. Verify that batch by read-back before dispatching dependent later batches. Reuse immutable IDs and reconcile uncertain outcomes before advancing dependencies; an absent ID after timeout is not proof that the original request never committed. Apply the upload-admission rules below before every append, including retries.
5. Read back the journal, verify each submitted ID and canonical hash; only then acknowledge those operations locally. Physical duplicate identical rows are ignored logically. Differing body for one ID stops sync as corruption.
6. Recompute local materialized view and status. Synced means this cycle read successfully and no known pending edits/conflicts remain; it is not a global assertion that all offline devices have converged. Update last-success time only for a completed valid reconciliation.

Full journal revalidation is the version-1 correctness baseline. Row cursors may not bypass integrity checks or assume row order is causal order. Later optimizations require proof by replay equivalence. Append-only discipline is enforced by the app; manual edits are unsupported. Malformed or missing previously acknowledged operations cause an error; a fresh device cannot cryptographically prove that a plausible history was not manually rewritten.

## Merge and first connection

Initial preview compares exact stable identities, explicit legacy-name aliases and local/remote memberships. Display counts for additions, duplicates, missing gist references and conflicts plus the theme/font choices to import. Equal stable identities merge once. Distinct collection IDs with the same normalized display name require an alias decision in preview, never silent rename guessing. Confirmation binds a digest of the preview inputs. Re-read before committing; changed inputs require refreshed preview. Concurrent changes after confirmation are handled causally, not overwritten. Cancel performs no remote merge writes.

Merge confirmation MUST NOT implicitly resolve differing candidate values. For equal local/destination values, retain one visible value and the import receipt. For differing values without an explicit user resolution, import each source candidate as an independent destination-scoped candidate with no destination-head parents; merely observing the preview does not make the source candidate descend from destination heads. Retain deletion candidates and each distinct unresolved source candidate.

Source parent IDs MUST NOT cross workspace boundaries. Store source provenance locally in the receipt. Derive destination operation IDs using UUIDv5 namespace `b0ae3617-19b0-5bc4-a042-ec919d443863` and the RFC 8785 encoding of [receiptId, destinationWorkspaceId, logicalFieldKey, sourceCandidateIdentity]; reuse the persisted receipt and mapping on retry. For pre-sync local values, persist stable candidate identities in the receipt before dispatch. Candidate import roots precede any explicit resolution operation. Resolution references all displayed destination candidates, including imported candidates, and must respect entity lifecycle contexts. Newly discovered candidates after confirmation remain unresolved and are not silently consumed.

Journal/causal-head/conflict indexes distinguish workspace and library identity; replay unions only the selected destination workspace. Switching destination never mutates source operation scope or parents. Retain source pending work until the destination acknowledges its imported equivalents; later source edits remain pending for subsequent reconciliation. A rejected/cancelled destination switch leaves the original connection untouched.

US1 implements initial-merge conflict choices and persists theme/font candidates through the generic scoped store. It does not depend on US2 ongoing-conflict integration or US4 picker/live appearance application. US1 is independently reviewable, not the full first release.

## Errors and cancellation

| Condition | Behavior |
|---|---|
| 401/token expired | Stop requests, retain pending, reconnect required; user gesture obtains token |
| 403 access/policy | Distinguish authorization from quota; explain permission recovery; no automatic file replacement |
| 404/file deleted | Preserve local workspace and pending; select/recover storage explicitly |
| 429/transient 5xx/network timeout | Bounded jittered backoff; uncertain writes reconciled by ID; retain pending |
| Schema/hash/scope failure | Stop affected connection safely with actionable message; no truncate/overwrite |
| Upload capacity threshold | Pause appends including retries; continue valid reads and acknowledgement; retain unverified pending work |
| Disconnect/account switch | Abort transport where possible, invalidate UI generation and prevent new dispatch; already accepted Google requests may still complete |
| Conflict | Suspend only affected logical item; unrelated records continue |

Disconnect prevents dispatch of new requests and cancels in-flight requests where possible, but cannot retract a request already dispatched. A late response may update acknowledgement state for its captured original connection only. It MUST NOT restart synchronization, dispatch follow-up requests or apply another account's data to the active UI. Uncertain outcomes remain pending until reconnect reconciliation. No secrets in diagnostics; logs use error category and redacted correlation IDs only.

## Upload admission and concurrent capacity

Version 1 uses upload-admission thresholds of 20,000 distinct operations, 10 MiB cumulative canonical body bytes, or 25,000 physical operation rows, whichever is reached first. Before each append, read current usage and calculate projected usage for the complete batch, counting duplicate rows physically and unique bodies once. Do not dispatch a batch that would exceed any threshold; at a threshold pause append requests including retries.

These checks are per client, not a distributed reservation. Concurrent clients may exceed a threshold. Exceedance alone is not corruption: continue chunked reads, validation and acknowledgement of operations already verified remotely. Stop new append requests while at/above thresholds. Unverified operations remain pending and recoverable; a read alone must not be mistaken for successful upload of missing operations.

Never truncate history, discard tombstones, remove duplicate rows or clear pending work to regain capacity. Show an upload-capacity message and offer explicit new-storage selection with the existing preview/merge flow. Read resource limits preserve known-good local state and report incomplete reconciliation, never a false success. Growth/compaction remains outside version 1.

## Required transport acceptance gate

Using two isolated browser profiles and a disposable file: simultaneously append distinct batches, drop an append response, retry identical operation IDs and read back all expected IDs/hashes. Repeat 100 rounds with no lost logical operations, no overwritten row and identical eventual replay on both devices. If the test fails, this transport is not ready for delivery: preserve the confirmed product spec and revisit serialized transport infrastructure separately. Google does not document an exactly-once client append guarantee.

The gate also covers parent/child chains spanning batches, interruption before/after every batch response and retry with identical IDs. Every committed prefix must be causally closed. Capacity acceptance separately covers exact boundaries, over-limit projected batches and simultaneous near-limit admissions; after overshoot valid data is read/acknowledged while new appends stop.
