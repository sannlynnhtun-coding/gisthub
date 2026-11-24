# Project rules

- Read this file before working on this project.
- Visual redesign is allowed: themes, fonts, colors, spacing, borders, shadows, and presentation may change.
- Keep top and bottom padding equal on UI controls and panels. Use `padding-block` in CSS to apply the same value to both sides.
- Preserve existing workflows: navigation destinations, action availability, interaction steps, validation, confirmations, save behavior, import/export behavior, and task outcomes must remain intact unless the user explicitly authorizes a workflow change.
- Preserve user data, account isolation, security, accessibility, and existing integrations.
- For small fixes and visual refinements to existing features, implement directly, run the app, and verify the result. Do not create a separate plan unless the user requests one. Reserve feature specifications and design planning for new features or substantial redesigns.
- Do not push to Git unless the user explicitly requests it. A local commit may be created when needed.
- Reuse the existing appearance picker, catalogs, components, and persistence mechanisms where possible.
- Use the user's exact requested Git branch name; do not automatically add a prefix.
