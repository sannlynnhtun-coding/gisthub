# Research: GitHub Dashboard Home

## Routing and navigation

**Decision**: Replace `Pages/Start.razor` content at `/`; retain Discovery in `Pages/Home.razor`. Add `home` before `my-collection` inside the existing Home category and synchronize the Quick Access allowlist.
**Rationale**: Root is currently a bookmark-aware redirect; category controls are disclosures/tabs rather than page links. This preserves both shell layouts and all nine categories. Keep the collection command’s `/my-gists?favorites=true` behavior and direct unfiltered URLs.
**Alternatives considered**: Renaming Discovery’s component or creating another root route risks unrelated churn/duplicate routes. New top-level category controls would change shell workflows unnecessarily.

## Appearance and charts

**Decision**: Use `.neo-page`, shared buttons, semantic HSL tokens for background/card/foreground/primary/secondary/muted/border/ring, shared radius and UI font. Implement bounded charts with SVG/CSS and text/table summaries.
**Rationale**: Existing appearance presets and ThemeToggle already own presentation and persistence; CSS variables respond immediately to changes. Existing dependencies do not include a chart library.
**Alternatives considered**: Copying the reference’s Tailwind CDN, jQuery, Chart.js, fonts and separate dark toggle would create a second app shell and theme system.

## Public data retrieval

**Decision**: Add one IGithubService operation returning a self-contained public dashboard result. Request public user identity then one repository page, `per_page=100&sort=updated&direction=desc`; omit authorization. Keep existing configured direct/proxy routing. Label results as the latest loaded public repositories and conservatively signal possible truncation when 100 are returned.
**Rationale**: The [official GitHub repository documentation](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user) describes this as a public-repository listing with maximum 100 results per page. This supports a predictable two-request load without new account permissions. Counts and exports describe only the loaded population.
**Alternatives considered**: Exhaustive pagination and per-repository checks increase rate-limit exposure; authenticated account-wide requests risk scope/privacy expansion. They are unnecessary for the requested first version.

## Concurrency and errors

**Decision**: A single load result contains developer, repositories, scope and error, rather than exposing mutable shared LastError to the page. Reuse request/error helpers, capturing each error immediately and never relying on LastError after another await. Page load revisions discard obsolete completions, including profile-change/disposal completions; commit identity and repository rows together. Reset displayed data on a new explicit load and disable export until success.
**Rationale**: Existing gist service methods use shared LastError. Dashboard data must not mix identities or corrupt existing consumer error behavior. Sequential identity/repository calls and a result-local error keep handling explicit. Profile changes clear dashboard state; default from the newly active profile only when ready.
**Alternatives considered**: Redesigning all gist service errors or adding a global dashboard state service creates unrelated scope. Cancellation alone is insufficient protection from late results.

## Metric meaning and demonstration views

**Decision**: Stars/forks/open-issue counts and license/description/topic coverage derive from loaded repository metadata. Repository language count and update-month count have explicit labels. Benchmark/security policy/retention examples are deterministic local demonstrations; unmeasured real metrics say Unavailable.
**Rationale**: The reference mixes public metadata with fabricated benchmark, triage and cadence content. Repository metadata cannot establish real security posture, contributor retention or endpoint latency. The [GitHub repository resource](https://docs.github.com/en/rest/repos/repos) also supplies repository issue counts; display the issue/PR ambiguity in the UI rather than implying a triage audit.
**Alternatives considered**: Copying simulated numbers into a Live summary misleads users; adding genuine auditing/benchmark services exceeds scope.

## Safety and reuse

**Decision**: Render text through Razor escaping; permit only validated GitHub HTTPS repository destinations and avatars from the expected GitHub avatar host. Construct clone text from validated owner/repository identifiers. Export actual repository rows through existing `JsonTableConverter.Csv`, clipboard through `copyToClipboard`, downloads through `downloadBytes`.
**Rationale**: Existing code already handles spreadsheet formula escaping, clipboard denial and downloads. Avoid interpreting metadata as markup or shell code. Clone commands are copied, never executed.
**Alternatives considered**: Copying reference string-to-HTML insertion and handwritten CSV escaping duplicates code and weakens trust boundaries.

## Planning scaffold

**Decision**: Produce the required documents directly, retaining branch `main` and the existing feature pointer.
**Rationale**: Setup script, plan template, constitution and extension hook file are absent. Local repository inspection and a read-only research agent resolved the architectural questions without adding scaffold code.
**Alternatives considered**: Installing or rebuilding Spec Kit solely for this plan is unrelated work.
