# Dashboard Contracts

## User-facing navigation

- `/`: Home dashboard, no storage-based redirect. Exact-active match so Home is not active on every page.
- `/my-gists` and all existing query forms: unchanged collection routes. Existing My Collection command remains `my-gists?favorites=true`.
- `/discovery`: unchanged discovery feed.
- Home category command order begins `home`, `my-collection`, then existing commands. Shared header/sidebar brand links go to app root using base-relative navigation. No additional category or automatic Quick Access pin.
- MainLayout root label is Home; collection label is My Collection. Global search/shortcut ownership and tool navigation remain unchanged.

## Service contract (planned)

Add `Task<GithubDashboardResult> GetPublicDashboardAsync(string username)` to IGithubService; update all implementations/fakes. Validate/encode username at the request boundary. Result contains developer, repositories, scope/loading timestamp or an explicit error, as defined in [data-model.md](../data-model.md). No token parameter and no mutations. Existing gist methods retain signatures and behavior.

Requests use the configured GitHub base URL:

1. `GET /users/{encodedUsername}` for public identity.
2. `GET /users/{encodedUsername}/repos?per_page=100&sort=updated&direction=desc` for public repositories.

No Authorization header, `/user/repos`, POST/PATCH/DELETE, workflow calls, or repository policy calls. Same GitHub Accept header and error mapping patterns as existing service. A failed request returns an error rather than an empty successful list. Preserve 404, 403/429 rate-limit/reset information and network errors. Result is consumed only by the current page load revision.

## Display contract

Summary labels always identify loaded public scope. Language means repository primary-language count; timeline means update-month count; open issues may include pull requests. All four views are visible controls with current-state semantics. Demo indicators remain adjacent to example values and controls; unavailable measured data remains unavailable. Quality coverage states numerator/denominator and excludes no rows silently.

Render metadata as text; validate external HTTPS hosts before navigation. External new-tab links include noopener/noreferrer. Dialog inspection supports close, Escape, focus containment and restoration. Every chart has a text/table equivalent; do not rely on color alone. Reuse shared appearance tokens and controls.

## Export and clipboard contract

Export button says Export loaded repositories; filename uses validated canonical username. CSV columns: Developer, Repository, Language, Stars, Forks, Open issues (including PRs), Updated UTC, URL, Loaded at UTC, Scope. One row per loaded public repository, consistent raw numeric counts and ISO timestamps, empty unknown values. Scope says latest updated public repositories, up to 100, and notes possible truncation. Demo values excluded.

Use JsonTableConverter.Csv to quote embedded quotes/newlines and neutralize formula-like text, and downloadBytes for UTF-8 download. Report failures visibly. Copy action produces `git clone https://github.com/{validatedOwner}/{validatedRepo}.git`; no shell execution or arbitrary command suffix. Clipboard denial yields retry/manual-copy feedback, never a false success.

## Persistence compatibility

Register `home` in both command lists; accept existing Quick Access arrays unchanged, preserving order. Existing settings backup validation automatically uses the shared validator. Dashboard must not write profile, collection, preference, or auth storage. No server-side contract or migration is introduced.
