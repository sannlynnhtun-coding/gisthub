# GistHub

GistHub is a Blazor WebAssembly progressive web app for discovering, creating, and organizing GitHub Gists. GitHub is the remote source for gist content, while IndexedDB provides an account-scoped local workspace for cached gists, bookmarks, ordering, and collection assignments.

## Overview

The Flutter Web and Android client is included in [GistHub.Flutter](GistHub.Flutter/README.md).
It shares this repository and has its own [build/release workflow](.github/workflows/flutter.yml).
The Flutter client excludes Diagram Editor and YouTube Downloader. Android APKs
are published under [GitHub Releases](https://github.com/sannlynnhtun-coding/gisthub/releases).

The app supports two complementary workflows:

- Explore public gists as a guest, filter them by language, inspect another user's public gists, and connect a GitHub account when an action requires authentication.
- Manage a personal gist library: create, edit, delete, import, clone, search, bookmark, reorder, and group gists into local collections.

Additional features include a curated SLH collection, Markdown and Mermaid rendering, syntax highlighting, a JSON parser, code-to-image export, light/dark themes, and an installable PWA shell. The Trending page is currently a placeholder.

## Application workflow

1. **Start** - `/` opens My Collection, showing bookmarked gists when bookmarks exist. Discovery is available at `/discovery`.
2. **Connect GitHub** - `/login` validates a Personal Access Token against GitHub's `/user` endpoint, then saves the named profile in browser IndexedDB.
3. **Build the local cache** - a new profile initially fetches full content for up to 30 gists. Later syncs from **My Gists** refresh the account's cached gists, re-parse tags from descriptions, and preserve local bookmarks, bookmark order, and collection assignments.
4. **Manage gists** - create, edit, delete, clone, or import JSON. These operations call the GitHub API and then update the local cache.
5. **Organize locally** - bookmarks and collections are stored in the browser. They are not written to GitHub or synchronized across browsers/devices.
6. **Resume** - on a later visit, the first saved profile is restored and its account-scoped cache is available immediately.

```text
Blazor pages and components
    |-- GithubService --> GitHub API
    |                     |-- development: https://api.github.com
    |                     `-- production: /api/github via Vercel rewrite
    |
    `-- IndexedDbService --> profiles, account-scoped gists, and groups
```

## Main features

- Deployment update notifications: a header bell offers an explicit update after protecting local drafts and downloading the new WASM assets. Optional OneSignal Web Push is sent after production deploys, without version polling. See [setup and limitations](docs/web-push-updates.md).

- Appearance picker: select a theme, style, preset, or font, then use **Favorite** to keep it in that category's **Favorites only** list. Favorites persist locally across reloads.
- A download button with a reminder dot appears in the header when backed-up local preferences, favorites, bookmarks, playlists, or tags change. It stays visible across reloads until you click it or download a full backup from Local settings. Changes during a download keep the reminder visible. Backups never download automatically, including after bookmark restore.
- **Local settings** (`/settings`, also linked from the appearance picker) downloads and restores one JSON file with appearance choices/favorites, sound/sidebar/privacy/tool-category preferences, the saved Markdown Cards draft, bookmarks, playlists, assignments, and local tags. Restore merges favorites and library metadata, replaces the included preferences/draft, and reloads the app. Sync accounts first: missing cached gists are reported and skipped. GitHub tokens, profiles, and gist contents are excluded. Existing bookmark-only backups remain available separately.

Open **Tools → Tools Guide** (`/tools`) for an explanation and example use case for every tool. Every card has an **Open tool** action: it navigates to the tool page or opens the existing dialog directly, returning focus to its button when closed.

- Public discovery feed and public-gist lookup by GitHub username
- Single and bulk cloning into the connected GitHub account
- Personal gist create, view, edit, delete, sync, and JSON import
- Search by description, file, content, or parsed `#tags`
- Local bookmarks with drag-and-drop ordering and account-scoped JSON backup/restore
- Local multi-collection assignment and collection filtering
- Curated `@sannlynnhtun-coding` public-gist collection
- Markdown, Mermaid, and syntax-highlighted code previews
- JSON formatting/parsing and code-image utilities
- Tools → HTML to Image: paste or upload HTML (1 MB), import public URLs where CORS permits, and preview HTML/CSS in a sandboxed iframe. Export PNG/JPEG/WebP at 2× resolution or use browser Print / Save PDF. Canvas width is 320–1600 pixels and height is limited to 4096 pixels; oversized content blocks export instead of being silently cropped. Scripts, forms, navigation, and external assets are blocked; use inline styles and data-embedded PNG/JPEG/GIF/WebP images. Drafts are not auto-saved.
- Tools → Markdown to Text: local live conversion, Markdown upload (1 MB), Copy Text, sanitized Copy HTML, UTF-8 .txt download, Clear, and fullscreen. Links retain labels and images are removed; code spacing, tab-separated table cells, and task checkbox symbols remain readable. Drafts are not auto-saved.
- Tools → Formula to Image: local KaTeX math preview, examples, title/author, size/padding/colors, display or inline math, transparent PNG/WebP/browser SVG, opaque JPEG, .tex math upload (16 KB), and copyable settings. Raster exports use 2× resolution. SVG embeds MathML in foreignObject and requires a compatible browser/viewer; choose PNG for slides and image editors. Full LaTeX documents, AI styling, and draft autosave are not included.
- Tools → Mermaid to Image: live preview of Mermaid source, flowchart/sequence/class examples, four built-in themes, title/author labels, .mmd upload (64 KB), copyable settings, PNG/JPEG/WebP at 2× resolution, scalable SVG, and browser Print / Save PDF. Invalid diagrams disable export. Rendering uses the existing Mermaid CDN; source stays in-browser. Drafts are not auto-saved; custom CSS and AI styling are not included.
- Tools → Markdown to Cards: split up to 128 KB of Markdown by H1/H2/H3 headings, a custom delimiter in a separate paragraph, or a character target between blocks. Generate up to 24 numbered cards with existing themes, square/portrait/landscape/auto canvases, and PNG/JPEG/WebP output. Download individual preview images or all cards in an ordered ZIP. Code blocks, lists, and tables remain intact; oversized sections must be split manually. Previews update with Generate cards, and edits disable stale downloads. Markdown drafts save in this browser's local storage; settings are not saved. Test splitting with `node scripts/test-markdown-card-splitting.mjs`; test the running UI with `BROWSER_CHECK_CARD_TOOL=1 node scripts/check-browser-errors.mjs http://localhost:5187/tools/markdown-to-cards` (set the environment variable using your shell's syntax).
- Tools → Markdown + Code Converter: Markdown upload, themed live preview, GFM tables/task lists, syntax highlighting, KaTeX math (`$...$` / `$$...$$`), Mermaid diagrams, PNG/JPEG/WebP downloads, and browser Print / Save PDF. Image exports are 2× resolution; JPEG/WebP have quality controls. Oversized Markdown captures fail instead of silently cropping; PDF lets long Markdown flow across pages. Invalid math/diagrams retain source, remote images appear as labels, and AI styling is not included. Conversion runs locally; Mermaid uses the app's existing CDN library.
- Markdown to DOCX from Tools: paste or upload up to 1 MB, preview locally, and download editable headings, lists, tables, links, and monospaced code. Images export as labeled links; math and diagrams retain source text. Conversion needs no server or external service.
- JSON to Table with live preview, JSON/text upload, a hide/show input panel, expandable nested data, object/array field checkboxes shared by preview and CSV/HTML exports, and row search and sorting
- Base64 text and file encoding/decoding from Tools, with UTF-8/Latin-1, live mode, separate-line processing, URL-safe output, and local file downloads
- Responsive UI, themes, sound controls, file blur, and PWA support

## Diagram Editor

Open **Tools → Diagram Editor** to create workflows, ER diagrams, and architecture diagrams. Create or import `.drawio`/diagram XML files, rename or duplicate drafts, and download editable source, PNG, or SVG. Empty drafts are retained. Local drafts are separated by GitHub account, with a separate guest library; they do not sync automatically.

The editor loads from `embed.diagrams.net` and requires internet access. The selected diagram is sent to that third-party frame; GitHub credentials are never sent to it. Autosave stores source in browser IndexedDB. Export `.drawio` backups before clearing browser data. A cross-tab conflict blocks an overwrite and offers Duplicate to retain the current work.

Expand **GitHub Gist** to open a Gist URL/ID and choose a diagram file. Signed-in users can save new public/secret Gists or explicitly update a linked file they own. Remote changes block an update; reopen the remote version or save a new Gist. Other files and the existing description are preserved. This check does not provide atomic protection against simultaneous remote writes. Truncated API source is rejected; download and import its original file instead. Guest drafts can be browsed and explicitly copied to the active account.

**Image export settings and presets** stores named, account-scoped PNG/SVG settings. Choose PNG scale (1–4), border (0–100 pixels), transparency, and current-page selection. SVG exports use border and page selection. Select a saved preset, edit its name/settings, and Save preset to update it, or choose New preset for a separate entry. The Library toggle and Fullscreen controls give the canvas more room.

The embedded editor and its host controls follow GistHub's light/dark theme, paper surfaces, accent colours, and borders. Changing the app theme captures and saves the current diagram before briefly reloading the embedded editor. The diagram source is retained; the editor's undo history restarts after that reload. If capture or storage fails, the theme update is deferred to protect the diagram.

Run storage and bridge regressions against a running local app:

```powershell
node scripts/run-diagram-tests.mjs http://localhost:5180
```

## Local YouTube downloader (Windows)

Double-click **Start-LocalDownloader.cmd** in the repository root. The launcher installs portable yt-dlp and FFmpeg tools into the ignored `.local-tools` folder, verifies their published SHA-256 checksums, publishes GistHub and its local ASP.NET Core service, and opens **http://localhost:5188/tools/youtube-downloader**. The first launch downloads the tools and takes longer. It requires the .NET 10 SDK, Node.js 22 or later, npm, and an internet connection.

You can also open **Tools → YouTube Downloader** in that local GistHub window. Paste a YouTube watch, Shorts, or youtu.be link, choose **Find downloads**, switch between Video and Audio, then download a listed format. Video-only streams are merged with compatible audio. Audio supports native M4A/WebM and MP3 conversion. The UI shows actual available formats; `≈` marks estimated sizes and unknown sizes remain unknown. Downloads can be cancelled. A completed file downloads automatically, with a **Save file again** fallback.

Keep the launcher running while using the tool. Closing it stops the service. The service listens only on IPv4 loopback port 5188 and accepts browser API writes only from its own origin. It does not connect the hosted website to your local machine. The local URL has its own browser storage: connect GitHub there to use your gist library, and transfer bookmarks with JSON backup/restore if needed.

Temporary files are stored under `%LOCALAPPDATA%\GistHub\Downloader`. Completed files and previews expire after one hour and are cleaned up on subsequent inspect/download requests. Live/upcoming videos and playlists are not supported. Jobs time out after 30 minutes, and individual source downloads are limited to 2 GB. YouTube restrictions, unavailable media, or extractor changes can cause errors; they appear in the tool. Update the portable dependencies when needed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-downloader-tools.ps1 -Update
```

For subsequent launches without rebuilding:

```powershell
.\Start-LocalDownloader.cmd -NoBuild
```

Downloader tests use deterministic child processes and do not require YouTube access:

```powershell
dotnet run --project GistHub.LocalDownloader.Tests
dotnet run --project GistHub.RegressionTests
```

Dependency references: [yt-dlp usage and dependencies](https://github.com/yt-dlp/yt-dlp#usage-and-options), [FFmpeg Windows builds](https://www.gyan.dev/ffmpeg/builds/). Portable third-party binaries are downloaded locally rather than committed or redistributed.

## Tech stack

- .NET 10 and Blazor WebAssembly
- C# services for GitHub access, state, and browser storage
- IndexedDB through JavaScript interop
- Tailwind CSS 3 with Forms and Typography plugins
- Marked, Mermaid, and highlight.js for rich gist previews
- Vercel for static hosting and the production GitHub API rewrite

## Getting started

### Prerequisites

- [.NET SDK 10.x](https://dotnet.microsoft.com/download)
- [Node.js 20](https://nodejs.org/) and npm
- A GitHub Personal Access Token with permission to read and write gists for authenticated features

### Install and run

From the repository root:

```bash
npm install --prefix GistHub
dotnet run --project GistHub/GistHub.csproj
```

Open the local URL printed by `dotnet run`. The MSBuild project runs the minified Tailwind build automatically before each .NET build.

For UI work, run the CSS watcher and the .NET watcher in separate terminals:

```bash
npm --prefix GistHub run build:css
```

```bash
dotnet watch --project GistHub/GistHub.csproj run
```

## Development workflow

1. Install JavaScript dependencies with `npm install --prefix GistHub`.
2. Run the Tailwind and .NET watchers while editing Razor, C#, or CSS files.
3. Exercise both guest and authenticated paths. GitHub calls go directly to `https://api.github.com` in development.
4. Before opening a pull request, restore and build the same solution used by CI:

   ```bash
   dotnet restore GistHub.slnx
   dotnet build GistHub.slnx --configuration Release --no-restore
   ```

The solution does not currently include an automated .NET test project, so the Release build and focused browser checks are the primary verification steps.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Public discovery feed and GitHub-user lookup |
| `/login` | Token validation and saved-profile selection |
| `/my-gists` | Cached personal library, sync, search, bookmarks, and import |
| `/editor` | Create a gist |
| `/editor/{GistId}` | Edit a gist |
| `/view/{GistId}` | View a gist from the local workspace |
| `/collections` | Create and manage local gist groups |
| `/settings` | Download and restore preferences, appearance favorites, and library metadata in one JSON backup |
| `/slh-collection` | Browse the curated SLH collection |
| `/slh-collection/{GistId}` | View an SLH collection gist |
| `/trending` | Coming-soon placeholder |

## Repository structure

```text
.
|-- GistHub.slnx
|-- GistHub/
|   |-- Components/       Reusable gist cards and utility overlays
|   |-- Layout/           Desktop/mobile navigation and app shell
|   |-- Models/           GitHub and local-workspace data models
|   |-- Pages/            Route-level Razor components
|   |-- Services/         GitHub API, app state, and IndexedDB access
|   `-- wwwroot/          CSS, JavaScript helpers, PWA assets, and Vercel config
`-- .github/workflows/    Build and deployment workflow
```

## Authentication and local data

GistHub does not have its own backend or account system. The browser sends the saved token to GitHub through `GithubService`; in production, requests use the `/api/github` Vercel rewrite.

Profiles currently include the access token and are stored unencrypted in the browser's IndexedDB. Use the app only on a trusted device, grant the token only the permissions it needs, and revoke the token in GitHub if the device or browser profile is compromised. Signing out clears the in-memory session; deleting a saved profile removes that profile record, while previously cached account data may remain locally.

## CI and deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs for pull requests and pushes targeting `main` or `master`:

- Pull requests install dependencies, restore the solution, and run a Release build.
- Branch pushes also publish the Blazor app, copy the Vercel configuration into `publish_output/wwwroot`, and deploy that directory to production.

Deployment requires these repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
