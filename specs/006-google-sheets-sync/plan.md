# Implementation Plan: Google Sheets Sync

**Date**: 2026-11-25
**Branch**: main (existing; no branch created)
**Specification**: [spec.md](spec.md)
**Status**: Phase 0 research and Phase 1 design complete; implementation and database changes not performed.

## Technical Context

- Existing app: .NET 10 Blazor WebAssembly/PWA, C# services and JavaScript interop; static hosting, no application backend required for this design. Desktop/mobile browser coverage only; Flutter excluded.
- Existing persistence: GistHubDB version 4, profiles/gists/groups; gist keys qualify the cache account, groups currently lack an owner field. Theme/font are currently browser-global localStorage preferences. These are integration gaps, not existing guarantees of account isolation.
- Design: account-scoped IndexedDB metadata, transactional outbox, immutable remote operation journal, RFC 8785 canonical body hashing with a separate digest, workspace-scoped causal conflict detection, Google Identity Services browser token flow, Sheets REST and Google Picker with drive.file permission.
- Additional public configuration: OAuth client ID, Google Cloud project number and referrer/API-restricted Picker API key. Never deploy a client secret or service-account key. Access token held in memory only.
- Targets: spec SC-001–SC-007, including 1,000 bookmarks/100 collections/500 assignments and 30-second propagation after a requested sync under the stated conditions.
- Local durability means completed IndexedDB transactions; browser storage clearing/eviction is not recoverable for changes never uploaded. Retain existing manual backups.
- Tooling limitation: setup-plan.ps1 is missing; resolve-template.ps1 accepts only spec-template and cannot resolve a plan template. No constitution or extensions.yml exists. Used .specify/feature.json and the neighboring plan's headings; no workflow scripts were added or repaired.

## Constitution Check

No constitution file exists, so no constitution compliance claim is made. Apply rules.md and the five confirmed clarifications.

| Gate | Pre-design | Post-design |
|---|---|---|
| Preserve existing workflows and backups | Required | Pass by design: optional sync section, existing actions retained |
| Account and connection isolation | Required | Pass by design: immutable captured identity, scoped metadata/outbox and switch cancellation |
| Preserve user data | Required | Pass by design: additive future schema upgrade, preview/merge, retained outbox and tombstones |
| Exclude secrets and gist content | Required | Pass by design: allowlisted transport DTOs, in-memory token |
| Layout stays device-local | Required | Pass by design: transport excludes layout and unrelated settings |
| No app/database mutations during planning | Required | Pass: documentation only |

These are design checks, not runtime test results. Release remains gated by live concurrent-append/retry tests, OAuth/Picker integration and the validation guide. No unjustified rule violations identified.

## Phase 0 — Research

See [research.md](research.md). Decisions resolve authentication, file selection, concurrent writes, merge identity, local persistence integration, account-switch races, retries and retention. No unresolved product question remains. Google append behavior under concurrent clients must be validated during implementation; if validation fails, stop implementation of sync delivery and revisit the transport rather than claim no-loss behavior.

## Phase 1 — Design

See [data-model.md](data-model.md), [protocol contract](contracts/sync-protocol.md), [UI contract](contracts/sync-ui.md) and [quickstart.md](quickstart.md).

### Intended integration boundaries

- Extend Services/StorageService.cs and wwwroot/js/indexedDb.js with atomic local metadata + outbox transactions; preserve profiles, gist content and account-qualified cache behavior.
- Introduce explicit transport models and a pure replay/merge engine; never serialize LocalGist or GistProfile to Google.
- Add a separate sync coordinator and Google identity/Sheets bridge. Existing GistSyncService remains responsible for GitHub content synchronization.
- Route bookmark/group/tag mutations, existing import/restore paths and theme/font changes through the same durable metadata boundary. Incoming replay updates local projections without creating another outgoing edit.
- Add optional controls in the existing Local settings screen; reuse current appearance picker and application notifications. Preserve backup dirty indicators and exclude auth material from backups.
- Keep metadata for absent cached gists separately; project it onto cache entries after normal GitHub fetch without changing remote gists.

### Future implementation sequence

1. Prove the remote append/read-back behavior and pure merge protocol with synthetic fixtures, including simultaneous devices and lost responses.
2. Implement additive local storage upgrade, account-scoped metadata and transactional outbox; verify preservation using copied test fixtures.
3. Implement Google setup/configuration, authorization, file creation/selection and schema validation.
4. Deliver US1 with confirmed import, initial conflict choices and generic persistence of theme/font candidates; extend the same component in US2 for ongoing sync conflicts. US1 does not require US4 live appearance application. Integrate parent-first, causally closed batches and connection-safe disconnect/reconnect; import never implicitly resolves candidates or copies parents across workspaces.
5. Integrate per-account theme/font and existing edit/import/restore paths while retaining per-device layout.
6. Run deterministic protocol/storage tests, existing regressions and real two-device acceptance checks.

These are planning stages, not a generated tasks.md or authorization to implement.

## Risks and Limits

Google Sheets is not a transactional multi-device database. Atomic request application does not make a client read/modify/write sequence isolated. The design therefore appends immutable events, deduplicates replay and never overwrites a shared snapshot. Remote ordering and timestamps do not choose conflict winners. Eventual convergence requires each participating device to sync successfully; an offline device cannot know about an unseen concurrent edit.

Version 1 retains complete history/tombstones and does not compact remote storage. Upload-admission thresholds are 20,000 distinct operations, 10 MiB cumulative canonical body bytes, or 25,000 physical operation rows. Check projected usage before each append; per-client checks cannot reserve global capacity, so concurrent overshoot is possible. Pause appends including retries at/above thresholds, retain pending work and continue reading/validating/acknowledging already committed data even above thresholds. Never use upload thresholds as read cutoffs. Resource-limited reads report incomplete reconciliation while retaining known-good state. Offer explicit new-storage selection and preview/merge; no destructive compaction or automatic file replacement.

See contracts/sync-protocol.md for canonical hashing, destination-scoped candidate import, topological batch admission, cancellation semantics and exact capacity behavior. These protocol rules are required by the associated tasks and validation scenarios. A disconnected client dispatches no new request; already dispatched requests may complete only against their captured original connection. Growth/compaction and a backend for always-on synchronization remain deferred.
