# Validation guide: Quick Access

Run after implementation. Prerequisites: .NET 10 SDK, Node/npm, restored existing project dependencies and Chrome for the existing browser harness.

```powershell
dotnet build GistHub/GistHub.csproj
dotnet run --project GistHub.RegressionTests
dotnet run --project GistHub --urls http://localhost:5000
```

In another terminal:

```powershell
node scripts/check-browser-errors.mjs http://localhost:5000
```

Register focused Quick Access scenarios in the existing browser runner. Build already regenerates CSS through the project target. Do not deploy or publish gists for validation.

## Required scenarios

- Fresh browser: Home remains selected and ribbon collapsed; expand, open Quick Access and verify empty instructions. Nine tabs; arrows and Home/End work.
- Add a Home navigation command, Data overlay and Markdown workspace command from their source tabs. Each appears once in append order. Duplicate addition does nothing; removal from either location updates membership.
- Activate each pinned command and compare original behavior. Verify routes, retained workspace drafts, overlay close and Back focus return. Check Local settings, Appearance and Sound actions too.
- Drag the last of three items onto the first: it moves before the first, without activation. Verify reverse moves, self-drop, external drop, cancellation and repeated moves. Reload and confirm order.
- Use only keyboard to add, remove and move items. Confirm focus remains usable, boundary move buttons are disabled and changes announced. At a narrow touch viewport, use earlier/later controls and check overflow.
- Seed malformed JSON, non-array values, duplicate/unknown IDs and excessive input. Confirm controlled recovery and no command injection. Simulate storage denial; failed edits must not claim saved state or replace the last saved order.
- Pin YouTube Downloader in an allowed environment; simulate Vercel availability. It stays hidden and its stored membership survives other edits.
- Export local settings, change Quick Access, restore backup and reload: exact order returns. Older backups lacking the key still import; invalid Quick Access values reject the whole restore before writes. Existing bookmark/appearance round trips still pass.
- Preserve all original launcher selectors; run existing workspace, Markdown keyboard-navigation and local-settings checks through the harness. No unhandled browser errors.

See contracts/ui-and-preferences.md for observable behavior and data-model.md for validation rules. These are planned checks, not recorded test results.
