# Research decisions

## Integration

Decision: reuse ToolWorkspace.Pages and the current ribbon/guide/help catalogs.
Rationale: current Tools Guide and Cron Expression pages demonstrate the existing route, workspace and title pattern; MainLayout resolves page tools from the catalog.
Alternatives considered: a separate navigation shell or poster embed would duplicate behavior or fail the request for a project-native page.

## Presentation

Decision: reuse existing GistHub classes and theme tokens with responsive semantic tables.
Rationale: the user explicitly replaced the image-style requirement with the project's styling. Native text remains readable, selectable and accessible.
Alternatives considered: purple branded poster styling and fixed image dimensions are excluded by the corrected request.

## Content

Decision: transcribe the original second attachment, preserving all categories, repeated rows and key notation; visually verify before shipping.
Rationale: the generated poster has potential errors and is not a reliable replacement for the supplied source.
Alternatives considered: external shortcut lists may describe different keyboard profiles. No web research is needed to reproduce user-supplied content; do not claim the list is verified against a current Visual Studio release.

## State and dependencies

Decision: keep static rows in the page; no search, filtering, downloads, persistence, service abstraction or new package.
Rationale: the requested core behavior is a readable reference page. Existing Quick Access already handles launch preferences.
Alternatives considered: a shared shortcut service or JSON loader adds indirection with no current consumer.

All design choices are resolved. Spec Kit infrastructure remains unavailable as recorded in plan.md.
