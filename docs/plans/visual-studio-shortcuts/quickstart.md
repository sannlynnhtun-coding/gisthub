# Validation guide

Run from the repository root with .NET 10 and the project's existing Node dependencies installed.

```powershell
dotnet build GistHub/GistHub.csproj
dotnet run --project GistHub.RegressionTests
dotnet run --project GistHub/GistHub.csproj
```

Use the local URL printed by the development server. Existing build targets compile Tailwind. Inspect existing workspace browser scripts for their server/URL prerequisites before running them.

1. Open Tools → Visual Studio Shortcuts. Confirm the shared workspace header, Back button and help match other tools. Return with Back and confirm focus returns to the launcher.
2. Open the page from Tools Guide, then load /tools/visual-studio-shortcuts directly and reload. Confirm title, content and navigation work without a duplicate tool shell.
3. Compare every category and row with the original second attachment, including repeated rows, Projects and solutions continuation, sequential Ctrl+K commands, punctuation and arrow/mouse gestures. The generated poster is not the validation baseline.
4. Confirm the Windows/profile caveat and keyboard settings location are visible. Selecting text works; listed shortcuts are not intercepted by the page.
5. Inspect light and dark themes at desktop and 375px width. Confirm readable contrast, wrapped shortcut labels, no clipped rows and no page-level horizontal overflow. Navigate launch/help/Back controls by keyboard.
6. Add the command to Quick Access, launch it, reload and remove it. Confirm existing preference and launch behavior still works.
7. Run a focused regression check for the 11 category names, expected per-category row counts established during transcription, representative complex shortcut strings, and matching workspace/help/ribbon/guide registration. Run existing workspace/browser checks impacted by new catalog entries.

Expected result: every source shortcut is readable within the current GistHub design, with existing navigation and preferences intact. No application build or browser verification applies to the planning-only artifacts.
