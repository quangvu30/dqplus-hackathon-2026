# Slidev syntax cheat-sheet

Slidev decks are a single markdown file. Structure mistakes fail silently, so follow
these rules exactly.

## File skeleton

```markdown
---
theme: default
title: Acme — Series A
info: |
  Investor pitch deck for Acme.
transition: slide-left
mdc: true
---

# Acme
One line that says what you do

<!--
Speaker notes for the title slide go here.
-->

---
layout: two-cols
---

# Slide two headline

- bullet
- bullet

::right::

Content of the right column.

<!--
Notes for slide two.
-->

---

# Slide three headline
...
```

## Rules

- **Headmatter**: the FIRST frontmatter block configures the whole deck (`theme`,
  `title`, `info`, `transition`, `mdc`). It is not a slide.
- **Slide separator**: a line containing only `---`, surrounded by blank lines. The
  content right after the headmatter is slide 1.
- **Per-slide frontmatter**: to set a slide's layout, follow the separator immediately
  with another frontmatter block: `---` `layout: fact` `---`. No blank line between the
  separator and the frontmatter opening — otherwise it renders as a horizontal rule.
- **Speaker notes**: the **last** HTML comment block of a slide becomes its presenter
  notes. Keep exactly one notes comment per slide, at the end of the slide.
- **Progressive reveal**: wrap a list in `<v-clicks>` ... `</v-clicks>` to reveal items
  one per click. Use sparingly — every wrapped list adds clicks to the talk.

## Useful layouts (default theme)

| layout | use for |
|---|---|
| `cover` | title slide |
| `default` | ordinary content |
| `center` | single centered statement |
| `fact` | one big number (put the number in `#`, context below) |
| `statement` | bold claim |
| `quote` | testimonial / customer quote |
| `two-cols` | comparison; split columns with `::right::` |
| `two-cols-header` | heading spanning both columns, then `::left::` / `::right::` |
| `image-right` / `image-left` | text + image; set `image: <url>` in slide frontmatter |
| `section` | act break ("Traction", "The Ask") |
| `end` | final slide |

## Inline styling

- MDC-style class on an element: `# Big claim {.text-5xl}` (requires `mdc: true`).
- Slidev ships UnoCSS: utility classes like `text-center`, `mt-4`, `grid grid-cols-3 gap-4`
  work inside HTML elements: `<div class="grid grid-cols-3 gap-4"> ... </div>`.
- Big standalone stat: `<div class="text-6xl font-bold">$47B</div>`.

## Simple charts without assets

Prefer things that render from markdown alone:
- Tables for pricing/comparison.
- Mermaid blocks (` ```mermaid `) for flows and architecture — Slidev renders them natively.
- Utility-class bar "charts": a few `<div>`s with widths (`w-3/4 bg-blue-500 h-6`).

Leave `<!-- TODO visual: ... -->` placeholders for anything needing a real image.

## Commands

```bash
npx @slidev/cli slides.md --open                  # dev server / presenting
npx @slidev/cli build slides.md                   # static HTML → dist/
npx @slidev/cli export slides.md --format pptx    # or pdf, png
npx playwright install chromium                   # one-time, needed by export
```
