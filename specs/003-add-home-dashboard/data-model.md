# Data Model: GitHub Dashboard Home

All dashboard state is ephemeral. No database changes or preference migrations.

## Public dashboard result

- RequestedUsername: trimmed, optional leading @ removed, then validated as a GitHub username (1–39 ASCII alphanumerics/hyphens, no leading/trailing or consecutive hyphens).
- Developer: canonical login, optional display name/bio/avatar, public-repository count if supplied, validated profile URL.
- Repositories: up to 100 public repository records from one sorted page.
- LoadedAt: UTC timestamp used for scope/export provenance.
- Scope: latest-updated public repositories, loaded count, page limit 100, possibly truncated when count equals limit.
- Error: optional GithubApiError including status/message/rate-limit reset. Failure is distinct from an empty successful collection. Do not publish partial identity/repository success.

Result-local error capture avoids making the page depend on mutable service LastError. Public retrieval never uses the active profile’s token.

## Repository

Stable ID, name/full name, owner login, nullable description/language/license SPDX name, topics list, nonnegative stars/forks/open-issue counts, nullable update timestamp, fork/archive flags, validated GitHub HTTPS URL. Repository ID identifies inspection selection. Defensive normalization must preserve missing values rather than invent measurements; exclude any private-marked row from display and totals.

Developer owns many repositories; all summary calculations use exactly the loaded public rows. Counts are repository counts, not account lifetime/contribution totals.

## Summary projections

Total loaded repositories, stars and forks; issue/PR count; primary-language repository counts including Unknown; top seven repositories by stars with forks as comparison; repository update counts by chronological month; license, nonempty description, and topic coverage counts/percentages. Empty population yields zero counts and no percentage claim (show unavailable/empty). Stable ID/name tie-breakers make sorting deterministic.

Demo benchmark series and cadence matrix are static local examples with separate Demo labeling; never merge them into real repository records or exports. Security policy toggles, if present, hold only demo-local booleans.

## Explorer and view state

- Active view: overview, quality, benchmarks, cadence; default overview.
- Search: case-insensitive name/description match; language: exact selected primary language or all; sort: updated descending by default, stars descending, forks descending, or name ascending.
- Visible rows: filter then sort the loaded dataset, stable ties. Unknown update dates sort last.
- Inspection: optional selected ID plus trigger reference for focus restoration.
- Export: all loaded public rows, independent of explorer filters; button label makes this explicit. Export disabled without successful data or when zero rows.
- Status: idle, loading, success, empty, error; validation error does not issue network requests.
- Load revision increments on new load, profile change, and disposal. Only the current revision may change data/status/focus messages.

New load clears old identity/rows/inspection and filters, retaining the active view. Success commits identity and rows together; zero rows becomes empty. Failure becomes error with retry for that requested username. Profile changes clear viewed data and use the new profile username when available; never call AppState.SetProfile from dashboard interactions. Subscribe/unsubscribe with page lifecycle.
