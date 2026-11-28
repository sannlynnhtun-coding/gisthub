# Implementation notes

Started 2026-11-25 on main. User authorized task implementation. Baseline: .specify/feature.json modified and this feature folder untracked; tracked app source was clean. Preserve unrelated work and do not create/push a branch.

Checklist: requirements.md 16/16, no unchecked items. No constitution, extension hooks or prerequisite script is present; active feature resolved from .specify/feature.json. Existing .gitignore covers .NET bin/obj, node_modules, environment files and logs; this is not an npm publishing or Docker/Terraform project.

## Mutation inventory

- StorageService.cs: SaveGistAsync, SaveGroupAsync, DeleteGroupAsync; current groups are global, gist cache keys include username.
- MyGists.razor: bookmark toggle, bulk restore, drag ordering, group creation/assignment, local-tag changes and JSON import.
- Collections.razor: creation/deletion and affected-gist assignments.
- Editor.razor: bookmark/order, collection assignments and parsed description tags on save.
- Home.razor and SlhCollection.razor: clone writes and parsed tags.
- DiagramEditor.razor: gist cache writes preserving bookmark metadata.
- GistSyncService.cs: normal GitHub refresh reparses description tags. Sync must keep a distinct local-tag overlay.
- Settings.razor / localSettings.js / BookmarkBackupSerializer.cs: metadata backup/restore and preference restore; preserve formats and missing-reference reporting.
- ThemeToggle.razor / theme.js / fonts.js: existing picker writes theme, gisthub:theme-choice and gisthub:font. Layout key gisthub:workspace-layout remains local.

## Execution boundary

Build pure models/codec/tests and a disposable-file transport harness first. T007 requires a configured OAuth client and actual two-profile Google test. User reports no client exists yet; provide setup instructions. T009 database upgrade and all story integration remain blocked until the live gate passes. Do not mark T007 complete based on mocks.

## Completed checkpoint

T001-T006 complete. Pure C# protocol checks: 42 passing. JavaScript shared-fixture and local harness tests pass; existing executable regressions pass. T007 remains unchecked because no OAuth client is configured; see google-setup.md. No database or active app workflow has changed. The prerequisite script is still absent; it was not repaired as part of feature work.
