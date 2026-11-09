# Website preset sources

These are visual adaptations on GistHub's existing cards, inputs, buttons, search,
menus and tabs. No collection markup, ordering, actions, routes, or workflows are
replaced. Light/dark colors use the existing paired palettes.

| Reference | Typography used | Component treatment |
|---|---|---|
| [BoardUI](https://www.boardui.com/) | Local Inter / JetBrains Mono | Existing inset surfaces and segmented controls |
| [Sketchbook UI](https://sarthakrawat-1.github.io/sketchbook-ui/) | Caveat controls/headings, Inter body | Ink borders, irregular corners, offset button shadow |
| [Productive Schedule](https://theproductiveschedule.design/) | Instrument Sans / Schibsted Grotesk | Drafting outlines, pill actions, dotted selection |
| [Libraries.dev](https://libraries.dev/) | Inter / Roboto Mono | Luminous edges, CSS metallic button layers |
| [beUI Pro](https://pro.beui.dev/) | Geist / Geist Mono | Ambient layered panels and inset controls |
| [HeroUI](https://heroui.com/) | Inter | Floating cards, filled fields, pill actions |
| [Rare UI](https://www.rareui.com/) | Inter / Open Runde / Geist Mono | Independently authored folder-like surfaces and tactile controls |
| [Goop UI](https://goop.timmcmasters.work/docs/components) | Geist / DynaPuff / Geist Mono | Organic corners and restrained spring feedback |
| [beUI](https://beui.dev/) | Geist / Geist Mono | Compact command surfaces, capsule navigation |

Typography and public stylesheet/component references inspected 2026-11-10.
Libraries' Saans and HeroUI's custom Britti/heroSans display faces are not bundled;
their Inter body family is used for headings too. Sketchbook's system body is
represented by local Inter. These substitutions avoid distributing unlicensed
font files. Rare UI's restricted component source is not copied or ported. No
premium beUI Pro source or WebGL component dependencies are bundled.

Additional unchanged local font assets:

- Caveat, DynaPuff and Schibsted Grotesk: Latin variable fonts from
  `@fontsource-variable/<family>@5.3.0` via jsDelivr, each with its bundled SIL OFL.
- Open Runde regular/medium/semibold/bold: [original font repository](https://github.com/lauridskern/open-runde),
  commit `3e7ed7f3cdfa5523766db7e430066472615fc935`, SIL OFL in `OpenRunde-LICENSE.txt`.
- Inter, Instrument Sans, Geist, Geist Mono, JetBrains Mono, Roboto Mono and Myanmar
  fallback reuse existing local assets and licenses described in `README.md`.

Fonts load locally and are included in the existing offline service-worker cache.
Reduced motion disables decorative hover/press transforms. Native focus rings,
disabled controls, destructive colors and readable monospace code remain intact.
