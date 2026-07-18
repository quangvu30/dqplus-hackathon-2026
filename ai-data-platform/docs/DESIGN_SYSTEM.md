# Design System

The visual language of the live dashboard (`dashboard/index.html`) — the single UI surface
of the project. It's a **dark, dense, operator-console** aesthetic (GitHub-dark lineage):
information-first, zero chrome, everything on one screen and updating live. This doc is the
reference for keeping it consistent and for extending it.

The tokens below are the source of truth. They live as CSS custom properties in
`dashboard/index.html`; this doc mirrors them — if you change one, change both.

## 1. Design principles

1. **Density over whitespace.** This is a monitoring console, not a marketing page. Three
   columns, small type, tight padding. Show the whole pipeline at once.
2. **Provenance is visible.** Every enriched field can show a `source ↗` link and a
   confidence value. Trust is a first-class UI element, never hidden.
3. **State by color, consistently.** Green = good/done, amber = in-progress/pending, red =
   failure/dead, blue = active/interactive. This mapping holds across badges, dots, event
   kinds, and status labels.
4. **Live, calm motion.** The dashboard polls every 3s. Updates are in-place; nothing
   flashes or reflows aggressively. A `live` pulse in the header is the only ambient motion.
5. **No dependencies.** One self-contained HTML file — inline CSS, vanilla JS, system
   fonts. Nothing to build, nothing to fetch.

## 2. Color tokens

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0d1117` | Page background; also code/`pre` blocks |
| `--panel` | `#161b22` | Header, right column, cards |
| `--border` | `#30363d` | All hairlines, card borders, table rules |
| `--fg` | `#e6edf3` | Primary text |
| `--muted` | `#8b949e` | Secondary text, labels, meta |
| `--accent` | `#2f81f7` | Interactive, links, scores, active state |
| `--good` | `#3fb950` | Success — `ready`, `Verified`, `DraftReady`, idle |
| `--warn` | `#d29922` | Pending — `seeded`, `ranked`, busy |
| `--bad` | `#f85149` | Failure — `VerifyRejected`, `DraftDeadLettered`, dead |
| `--chip` | `#21262d` | Badge/ghost-button fill, hover surface |

**Selection highlight** is a one-off: `#1f6feb33` fill + `--accent` outline on `.ent.sel`.

### Semantic color mapping

The same three status colors carry meaning everywhere — learn it once:

```
GOOD  (green)  ready · Verified · DraftReady · dot.idle · status-ready
WARN  (amber)  seeded · ranked · dot.busy · status-ranked
BAD   (red)    VerifyRejected · DraftDeadLettered · dot.dead
ACCENT (blue)  links · scores · MatchesRanked · FilterCompleted · dot.starting · selection
```

## 3. Typography

- **Family:** system stack — `-apple-system, "Segoe UI", Roboto, sans-serif`. Monospace
  (`ui-monospace, Menlo, monospace`) for `pre` blocks (drafts, raw JSON).
- **Base:** `14px / 1.5`.
- **Scale:**

| Use | Size | Weight | Notes |
|---|---|---|---|
| Match score | 20px | 700 | `--accent` |
| Header H1 | 16px | 600 | |
| Partner/match name | 15px | 600 | |
| Body / base | 14px | 400 | |
| Meta, chips, table, cost | 12px | — | `--muted` |
| Section headers (`h2`, `.subhead`, `.lbl`) | 10–11px | 600 | UPPERCASE, `letter-spacing .05–.06em`, `--muted` |
| Badges, `source`, confidence | 10px | — | |

Section headers are the recurring motif: **tiny, uppercase, tracked-out, muted**. Use that
treatment for any new group label.

## 4. Layout

```
┌─────────────────────────────────────────────────────────────┐
│ header  (sticky, --panel)  title · cost stats · live · Run   │
├────────────┬──────────────────────────┬─────────────────────┤
│ LEFT 280px │ MID  1fr                 │ RIGHT 320px         │
│            │                          │ (--panel)           │
│ Startups   │ Selected startup detail: │ LLM Cost            │
│ Partners   │  matches · rationale ·   │ Pool & Queue Health │
│            │  drafts · profile ·      │ Event Stream        │
│            │  relationship graph      │                     │
└────────────┴──────────────────────────┴─────────────────────┘
```

- **Grid:** `280px 1fr 320px`, full-height (`calc(100vh - 53px)`), each column scrolls
  independently. Left column is the entity picker; middle is the drill-down; right is the
  live operational panel.
- **Spacing rhythm:** column padding `14px`; section gap `22px`; card padding `14px`,
  margin-bottom `12px`; field row padding `3px 0`.
- **Radii:** cards `8px`, buttons/entities/chips `6px`, badges `10px` (pill), status dots
  `50%`.

## 5. Components

| Component | Class | Anatomy |
|---|---|---|
| **Header stat** | `.stat` / `.stat b` | Muted label + bright value. Cost/entity/match live in the header. |
| **Button** | `button`, `button.ghost` | Solid accent (primary) or chip-fill outline (ghost). `brightness(1.1)` on hover. |
| **Entity row** | `.ent` (`.sel`) | Name (ellipsized) + optional `★` match count + status badge. Hover → chip fill; selected → accent outline. |
| **Badge** | `.badge` (+ status modifier) | Pill, 10px, muted by default; colored by status modifier (`.ready`, `.seeded`, `status-*`). |
| **Match card** | `.card` + `.match-head` | Big accent score · name · type badge · status badge, then a `.kv` meta row and EN/VI `.rationale` blocks. |
| **Provenance field** | `.fld` / `.fk` / `.fv` | Capitalized key (min 130px) + value + inline `source ↗` link + `conf`idence. Nested objects indent under a left border (`.nest`). |
| **Relationship row** | `.rel` | Accent `kind` · arrow · target. Unresolved targets render italic-muted (`.unres`); resolved ones are clickable `a.lnk`. |
| **Event row** | `.ev` | Bold kind (colored by `kind-*`) + right-aligned timestamp. |
| **Health dot** | `.dot` (+ state) | 8px status dot for worker/pool state. |
| **Cost bar** | `.costbar` | 6px accent bar for cost proportion. |
| **Code / draft** | `pre` | Wrapped monospace on `--bg`, bordered, `max-height 320px`, scrolls. |

### Event-kind color contract

Event rows are colored by a `kind-<EventKind>` class, so the stream is scannable at a
glance. Keep new saga events on the same semantics:

- `kind-Verified`, `kind-DraftReady` → green (`--good`)
- `kind-VerifyRejected`, `kind-DraftDeadLettered` → red (`--bad`)
- `kind-MatchesRanked`, `kind-FilterCompleted` → blue (`--accent`)

## 6. Content & safety conventions

- **Escape everything from the API.** The dashboard renders agent-produced text; helpers
  `escapeHtml` / `escapeAttr` wrap all interpolated values. Any new field render must go
  through them.
- **Empty states** use `.empty` (italic, muted) with a plain sentence — e.g. "No startups
  onboarded yet." Never leave a blank region.
- **Bilingual by default.** Rationale and drafts always show EN and VI, each under a tiny
  uppercase `.lbl`. Preserve that pairing for any new generated content.

## 7. Extending it

- Reuse a **token** — never hard-code a hex. If you need a new color, add it to `:root`.
- New status? Map it to one of the four semantic colors; don't introduce a fifth meaning.
- New panel on the right column? Wrap it in `.section` with a `<h2>` in the section-header
  style.
- Keep it **one file, no build step, no external requests** — that constraint is the point.
