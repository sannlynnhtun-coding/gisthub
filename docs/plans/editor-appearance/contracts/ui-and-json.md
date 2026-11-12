# UI and JSON contract

## Editor
- Paste my-useful-snippet into Description -> my useful snippet. Typing that same text leaves hyphens intact. Convert only the inserted fragment and preserve selection replacement/newlines.
- Preserve https://my-site.example/a-b, user-name@example.com, #my-tag, file-name.cs, /some-path/file, -12, 2026-11-12 and --flag. Numeric-only/date tokens are not prose kebab tokens.
- Filename On: My Useful Snippet.cs -> my-useful-snippet.cs; my_archive.tar.gz -> my-archive.tar.gz; .gitignore stays .gitignore. Preserve Burmese letters and combining marks. Existing loaded names are unchanged unless explicitly edited or conversion is explicitly re-enabled.
- Off bypasses automatic conversion. Conversion must be idempotent. A filename ending up empty/invalid blocks save with existing feedback. OriginalFilename stays the original GitHub dictionary key when renaming.
- A new editor starts Secret + Bookmarked; explicit user choices, existing gists and restored drafts take precedence. Bookmark ordering follows current save behavior.
- Toggle exposes its checked state and label; information button has an accessible name and shows the explanatory toast. Keyboard activation and dismiss are supported.

## Appearance JSON v1
Example (IDs are illustrative; actual values must exist in installed catalogs):
```json
{
  "format": "gisthub-appearance",
  "version": 1,
  "theme": "dark",
  "style": "default",
  "font": "default",
  "favorites": { "themes": [], "styles": [], "presets": [], "fonts": [] }
}
```
- Export exactly these fields from committed state, with no arbitrary CSS, HTML, URLs, account, token, gist, bookmark, sound or other settings.
- Accept plain JSON objects only, maximum 256 KiB UTF-8. Require all fields/categories, correct types and version 1; reject unknown top-level fields/categories and unsupported versions. This is a new appearance-only format, not the existing local-settings backup format.
- Validate IDs against each installed catalog; IDs at most 256 characters, favorite arrays at most 5000 entries/category, deduplicate favorites. Unknown IDs reject the whole import with a descriptive error; no silent fallback or partial import.
- Paste replaces the complete appearance selection and favorites rather than merging, so copy/paste round-trips exactly. It does not import the theme catalog itself.
- Fully validate before persistence or visual application. Snapshot all affected values; failures restore previous values and report failure. If storage prevents rollback, report that explicitly and keep prior rendered state where possible.
- Refresh saved datasets, Blazor component fields, selection names/checkmarks and favorites; later preview cancellation must retain imported values. Persist through reload and keep existing backup change tracking.
- Copy is an explicit clipboard write. Failure leaves settings unchanged and offers selectable JSON for manual copy. Paste offers a labelled textarea even if clipboard read is unavailable/denied. Apply/Cancel and accessible feedback fit the existing panel on mobile.
