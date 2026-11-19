# GistHub Flutter

Flutter Web and Android client for the GistHub app. This client lives in `GistHub.Flutter/` in the `sannlynnhtun-coding/gisthub` repository.

## Features

- GitHub token login, saved profiles, switching, deletion confirmation and sign out.
- Personal gist sync, ranked search across descriptions/tags/filenames/content,
  public/secret/bookmark filters, JSON paste/file import, create/edit/delete.
- Public discovery and username feeds, language filters, pagination, bulk cloning,
  SLH Collection and public multi-file viewing.
- Account-scoped local Collections with creation, rename, multiple collection
  assignment and deletion. Existing playlist storage keys are reused without
  migration. Removing a collection keeps its gists.
- Local Drafts: save without a network request, reopen/edit, bookmark, assign to
  Collections, and explicitly publish. Sync keeps drafts. Publishing preserves
  bookmarks and collection membership. Saving a remote gist locally makes an
  independent draft copy; publishing that copy creates a new GitHub gist.
- Mobile flow: Gists / Collections / Create / Saved / Account navigation,
  hashtag filtering, Recent/A-Z sorting, compact cards, detail actions and a
  pinned editor save/publish bar. Desktop keeps its sidebar and existing theme.
- Bookmarks with drag ordering and JSON backup/restore compatible with the Blazor
  `gisthub-bookmarks` v1 format. Restore validates the account and every item before
  merging matching local gists, retaining existing bookmarks and order.
- Markdown, Mermaid and syntax-highlighted previews, raw view, file selection,
  copy content/share links, GitHub links and gist JSON export.
- Global search (Ctrl/Cmd+K), bookmark-only search, light/dark themes, sound and
  file-card blur controls. Preferences persist locally.
- Appearance picker with the existing 153 catalog palettes plus Light/Dark,
  56 native surface styles, 7 presets and 76 bundled font options, including
  Myanmar. Search, live selection and Restore default appearance are available.
- JSON normalization including escaped JSON, comments and trailing commas;
  formatted/compact highlighted output, live mode, upload and download.
- JSON tables with expandable nested data, field selection for objects/arrays,
  row search, sorting and CSV/HTML exports using the same filtered data.
- Base64 text/file conversion, UTF-8/Latin-1, separate-line mode, URL-safe output,
  optional padding, live conversion and decoded binary downloads.
- Code/Markdown to PNG with six themes, language highlighting, line numbers,
  title/author, font size, padding, Auto/1:1/16:9/4:5 layouts, import, copy settings,
  clipboard image copy and download. Browser clipboard permissions may require
  using Save PNG instead.
- Responsive navigation and a Web manifest/service worker for installation and
  previously visited offline assets. GitHub operations still require internet.
- Trending retains the original Coming Soon state.

Diagram Editor is available in the Blazor app, which stores its drafts locally.

## Develop and verify

Use Flutter 3.44.2 / Dart 3.12.2 (the version pinned in CI), Java 17 and the
Android SDK for Android builds.

```sh
cd GistHub.Flutter
flutter pub get
flutter run -d chrome
flutter analyze --no-pub
flutter test --no-pub --coverage
flutter build web --release --no-web-resources-cdn
flutter build apk --release
flutter build appbundle --release
```

Web output: `build/web/`. Android output:
`build/app/outputs/flutter-apk/app-release.apk` and
`build/app/outputs/bundle/release/app-release.aab`.

Android currently uses the existing development signing key and example package
ID. APK/AAB artifacts are testing builds. Set a permanent application ID and
configure your release keystore before publishing to Google Play.

## Build workflow and deployment

The root [Flutter workflow](../.github/workflows/flutter.yml) runs on pull requests and pushes to main/master,
plus manual dispatch. It restores the locked dependencies, checks formatting,
runs analysis/tests, builds Web/APK/AAB and uploads all three build artifacts plus
coverage. Push a `flutter-v*` tag (for example `flutter-v1.0.0`) to build and
publish the APK as a release in `sannlynnhtun-coding/gisthub`. The release waits
for formatting, analysis, tests and Web/APK/AAB builds to pass. APK releases use
the existing development signing configuration.

No GitHub token is needed for tests; API calls use deterministic fakes.

For a Web deployment, create a separate Vercel project with Framework Preset
**Other**, no build command and output directory `.`. Add repository secrets
`VERCEL_TOKEN`, `VERCEL_ORG_ID` and `FLUTTER_VERCEL_PROJECT_ID`. Run the workflow
manually on main/master with `deploy_web` enabled. It deploys the already built
static files with `vercel.json`. This does not deploy over the Blazor project.

Production Web should use HTTPS (also required by browser secure storage and
clipboard APIs). Renderer scripts are bundled assets, not fetched from a CDN at
runtime. The preview sanitizes Markdown and uses strict Mermaid rendering.

## Appearance assets

The original palettes and style presets are reused from the Blazor catalog.
Flutter styles apply the catalog's corner radii, borders and native elevation;
CSS-only background ornaments and pseudo-elements are adapted to native surfaces.
Fonts are bundled as TTF/OTF for both Android and Web, with original licenses.
The Appearance page keeps its controls in Inter so decorative font choices
remain easy to reverse.

Generated assets are committed. To refresh them from a Blazor checkout:

```sh
python -m pip install fonttools brotli
python scripts/sync_appearance.py ../GistHub/wwwroot
```

## Connection recovery and verification

Safe GitHub reads retry transient connection errors and 502/503/504 responses
up to three attempts. Writes are never automatically repeated: after an
unconfirmed save, sync or check GitHub before trying again. A failed sync keeps
the saved library and bookmarks available, with a visible retry action.

Login, reconnect, failed-sync cache retention, and rejected credentials are
covered by automated tests. The current verification passed 50 tests, static
analysis, and release Web/APK/AAB builds. Live Web login and gist sync were
confirmed by the user; Android verification covers builds and automated tests,
without a physical device run.

Responsive UI review used 390x844 and 1440x900 browser viewports, including
loading, empty, error, cached-content and login states. `test/ux_preview.dart`
is a local review fixture with mock HTTP and sample data; production builds
use `lib/main.dart`. Network or DNS outages still require connectivity to
recover; retries cannot repair an unavailable network.

## Local data and limitations

Tokens use Flutter secure storage. Gists/collections/drafts/preferences live on the device
and are scoped by profile. Web local data is separate from the Blazor IndexedDB
workspace: sync GitHub gists and transfer bookmarks using backup/restore. Local
collections are not automatically transferred or synced between devices.

The editor saves one selected file at a time and preserves other gist files.
Save before switching files, or explicitly discard the unsaved file changes.
GitHub gist visibility is fixed after creation. Truncated remote files must be
loaded completely before editing/cloning; raw fetches never receive the token.

File imports are capped at 20 MB. Preferences storage is intended for a local
cache; browser storage quotas can limit large libraries. Export bookmark backups
before clearing app/browser data. Deleting a saved profile removes its token,
cache, bookmarks, drafts and collections on that device, after confirmation.

Preview assets reuse the original app's Marked, DOMPurify and Highlight.js, plus
bundled Mermaid 11.15.0 and the Dart grammar for Highlight.js 11.9.0. Their license
files are included under `assets/preview/`. Code-image rendering uses the Dart
`highlight` package so exported images include syntax colors on both platforms.

Local drafts belong to the selected saved profile. Connect a profile once;
then draft saving works offline. They are device-local and not a cloud backup.
The editor asks before leaving unsaved changes. Publish requires connectivity.
