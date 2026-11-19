# Research

- Decision: authenticate existing public dashboard reads with the active account token and verify the token identity first. Keep existing public repository ownership and 100-row coverage. An anonymous fallback would hide expired sessions.
- Decision: page the already loaded, filtered and sorted collection. API pagination would change the existing reporting scope.
- Decision: use GitHub public search results for recent commits and pull requests in the owner’s public repositories. Bound the results, disclose coverage, and distinguish missing or partial data from zero. Review time stays unavailable until actual review timestamps are loaded. Do not infer it from PR closure time.
- Decision: adapt the reference views inside GistHub’s existing Overview with existing appearance tokens. A separate workspace or bundled third-party demo would change navigation and data semantics.
