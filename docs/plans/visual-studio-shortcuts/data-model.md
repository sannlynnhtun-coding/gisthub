# Content model

Use local static content inside VisualStudioShortcuts.razor, with the smallest tuple/record shape consistent with the project.

| Entity | Fields | Relationship |
| --- | --- | --- |
| Shortcut category | Title, ordered rows | Exactly the 11 categories named in plan.md. |
| Shortcut row | Action, shortcut display text | Belongs to one category; identical rows may exist in different categories. |

Source order is meaningful. Both fields must be nonempty. Preserve key sequences, punctuation, alternatives, arrows and mouse gestures from the original attachment; render as Razor-escaped text. A display string avoids a parser that could confuse chord separators with alternatives.

No database schema, input validation boundary, state transition, user preference or API entity is introduced. IsToolWorkspace is the existing presentation context, not a new stored field.
