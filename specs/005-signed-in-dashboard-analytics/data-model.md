# Data Model

The active profile supplies the token and expected login. Session validation resolves the authoritative login before repositories or analytics are shown. Repository pagination is transient, with 3 rows per page and page 1 after filters or account changes. Analytics holds separate nullable commit and pull-request search results with capped rows and coverage flags. Review status comes from the pull request state and merge timestamp. No data is persisted by the feature.
