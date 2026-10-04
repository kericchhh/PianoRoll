# Studio palette

Black and graphite panels echo instrument enclosures. Warm white carries labels;
peach marks actions and selected notes; pink marks notes and keyboard focus.
Use Barlow 400 for labels and values, and 700 for headings and buttons. Numeric
values use tabular figures. Fonts are bundled locally via `@fontsource/barlow`.

| Color          | Hex       | Role                                     |
| -------------- | --------- | ---------------------------------------- |
| Black          | `#000000` | App background and text on light accents |
| Graphite       | `#171717` | Toolbar and sidebar                      |
| Panel          | `#242424` | Menus and skeleton surfaces              |
| Bone           | `#f1eee7` | Main text, hover surfaces, piano keys    |
| Ash            | `#b5b1aa` | Secondary labels                         |
| Peach          | `#ffb18a` | Primary actions and selected notes       |
| Pink           | `#e4a0bd` | Notes and focus outlines                 |
| Control border | `#87847d` | Input edges and menu boundaries          |

Measured from these sRGB values using WCAG relative luminance:

| Pair                      | Contrast |
| ------------------------- | -------- |
| Bone / graphite           | 15.47:1  |
| Ash / graphite            | 8.40:1   |
| Black / peach             | 11.91:1  |
| Pink / graphite           | 8.59:1   |
| Control border / graphite | 4.80:1   |

The text pairs exceed the 4.5:1 normal-text threshold in
[WCAG 2.2 contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
Control boundaries exceed the 3:1 threshold in
[WCAG 2.2 non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
These pair checks cover this palette; they do not constitute a full accessibility audit.

Controls and panels have square corners. Inputs use a visible bottom edge;
buttons invert on hover and retain a separate pink focus outline. Group controls
by purpose, use spacing and weight for hierarchy, and keep planned placeholders
static. Use the semantic CSS variables in `src/styles/index.css`; canvas drawing
uses matching colors in `rendering/colors.ts`.
