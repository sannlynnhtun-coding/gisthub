# Data model

No persisted gist or profile model changes.

## Markdown draft
One browser-local record under gisthub.markdown-live-preview.v1: version (1), source (string), filename (safe base name). Empty source is a valid saved draft and must not be replaced by a sample. Validate shape/version and the 1 MB UTF-8 limit when restoring; reject corrupt records with a visible recovery warning. Sanitize filenames before download. Do not store rendered HTML.

Source updates schedule rendering and guarded autosave. Latest revision wins when asynchronous enhancements complete. File import validates its byte size and finishes reading before replacing current source. Failed imports preserve the current draft. Clearing explicitly replaces source and persisted draft with empty content. Pending saves are flushed on page disposal/navigation where feasible; storage failure is reported and does not block manual export.

## Workspace UI state
Selected command tab: Home | Discover | Tools | View; component-local, default Home. Tab selection does not navigate. Current route continues to be owned by Blazor NavigationManager. Existing modal state, theme preferences, profile and storage interfaces keep their current contracts.
