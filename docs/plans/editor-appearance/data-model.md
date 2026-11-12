# Data model

No database schema, persisted gist model or GitHub API changes.

## Editor state
Description, Filename, OriginalFilename, Content, IsPublic, IsBookmarked and BookmarkOrder retain existing responsibilities. New editor-local FilenameKebabEnabled boolean defaults true; track whether filename was explicitly edited to avoid normalizing loaded names. Fresh gist: IsPublic=false, IsBookmarked=true. Load/edit and recovered draft values override defaults. Draft adds an optional FilenameKebabEnabled field, defaulting true when absent; existing description/name/privacy/bookmark fields remain authoritative. Never normalize draft text merely while restoring.

Description paste: clipboard fragment -> protected-token conversion -> selection replacement -> synchronize bound Description -> existing draft/save path.
Filename: explicit edit + toggle On -> conversion -> existing required-name validation -> create or original-key rename/update. Off bypasses conversion, not validation.

## Appearance payload
format="gisthub-appearance"; version=1; theme, style, font: installed catalog identifiers; favorites: object with themes/styles/presets/fonts arrays of catalog IDs. See contracts/ui-and-json.md for strict validation. Preset selection is derived, not stored redundantly.

Import transition: idle -> JSON entry -> validate -> snapshot -> persist/apply/refresh -> success. Validation failure leaves state unchanged; commit failure rolls back persisted keys, DOM appearance, component fields and favorites. Cancel writes nothing. Clipboard failure offers manual entry.

Appearance persistence reuses current theme, gisthub:theme-choice, gisthub:interface-style, gisthub:font and gisthub:appearance-favorites keys. Use existing explicit-theme choice convention rather than copying its internal marker into the public format. No unrelated localStorage keys, IndexedDB records or profile/token values enter this payload.
