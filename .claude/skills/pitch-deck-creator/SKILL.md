---
name: pitch-deck-creator
description: |
  Generate presentation-ready pitch decks: a structured markdown deck spec (headlines,
  bullets, visual suggestions, speaker notes) plus a Slidev slides.md that can be
  presented in the browser or exported to HTML/PPTX/PDF. Use this skill whenever the
  user wants to create a pitch deck, investor deck, sales deck, demo-day slides,
  startup presentation, partnership pitch, or any persuasive slide deck — even if they
  just say "I need slides for X" or "help me pitch Y" without using the word "deck".
---

# Pitch Deck Creator

## Overview

Creates structured pitch decks following proven frameworks for investor pitches, sales
presentations, or internal strategy decks. Produces two artifacts:

1. **`deck-spec.md`** — the thinking document: per-slide headlines, bullets, visual
   suggestions, and speaker notes. This is where the narrative gets built and reviewed.
2. **`slides.md`** — a presentation-ready [Slidev](https://sli.dev) deck generated from
   the spec. Runs in the browser with `npx @slidev/cli`, exports to PPTX/PDF/HTML.

Build the spec first, then render it to Slidev. The spec is where persuasion lives;
the Slidev file is just its faithful rendering. Don't skip the spec and write slides
directly — decks written slide-first tend to become lists of facts instead of a story.

## Workflow

### Step 1: Define the Deck

Establish these four things before writing anything:

1. **Purpose**: Investor raise, sales pitch, internal strategy, or partnership?
2. **Audience**: Who are you presenting to? (VCs think in markets and returns; a CTO
   thinks in risk and integration; a demo-day crowd thinks in memorability.)
3. **Duration**: 5, 10, or 20 minutes? Rule of thumb: ~1 slide per minute.
4. **Key ask**: What should the audience do after the last slide?

If the user hasn't specified some of these and you can ask, ask. If you can't ask
(or the user wants you to just proceed), infer the most likely answers from context,
**state your assumptions explicitly at the top of the deck spec**, and continue —
a deck built on named assumptions is easy to correct; a stalled deck helps no one.

### Step 2: Choose the Structure

**Investor Deck (10–12 slides):**
1. Title + tagline
2. Problem
3. Solution
4. Market size (TAM/SAM/SOM)
5. Product/demo
6. Business model
7. Traction/metrics
8. Go-to-market strategy
9. Team
10. Financials
11. The ask
12. Contact/appendix

**Sales Deck (8–10 slides):**
1. Title
2. Their problem (make it about them)
3. Cost of inaction
4. Your solution
5. How it works
6. Results/case studies
7. Pricing/packages
8. Next steps

For a 5-minute deck (demo day), compress: problem → solution → demo → traction →
team → ask. Cut market-size theater before you cut traction.

Adapt these structures to the material — they are the default skeleton, not a form to
fill. If the user has no traction yet, replace that slide with validation evidence
(pilots, LOIs, waitlist) rather than presenting an empty metrics slide.

### Step 3: Write the Deck Spec

For every slide:
- **Headline**: One takeaway sentence (not a label). The deck should be readable as a
  story from headlines alone — test this by reading only the headlines top to bottom.
- **Body**: 3–5 bullet points max, under 30 words total.
- **Visual suggestion**: Chart, image, or diagram idea.
- **Speaker notes**: What to say out loud — conversational sentences, not bullet echoes.

**Headline rules:**
- BAD: "Market Size"
- GOOD: "A $47B market growing 23% annually"

Use this exact template for `deck-spec.md`:

```markdown
# Pitch Deck: [Title]

**Assumptions**: [only if any were inferred in Step 1]

## Slide 1: [Title Slide]
**Headline**: [Company name + one-line description]
**Visual**: Logo, tagline
**Speaker notes**: [What to say]

## Slide 2: [Problem]
**Headline**: [Problem stated as insight]
**Body**:
- Point 1
- Point 2
- Point 3
**Visual**: [Suggestion]
**Speaker notes**: [What to say]

[Continue for all slides]
```

### Step 4: Render to Slidev

Generate `slides.md` in the same directory as the spec. Read
[`references/slidev-syntax.md`](references/slidev-syntax.md) before writing it — Slidev
has specific rules for headmatter, slide separators, layouts, and speaker notes, and a
malformed file fails silently (slides merge or notes vanish).

Mapping rules:
- Spec headline → the slide's `#` or `##` heading.
- Spec body bullets → slide content (wrap lists in `<v-clicks>` for progressive reveal).
- Spec speaker notes → the slide's trailing `<!-- ... -->` comment block.
- Spec visual suggestion → implement it if it's achievable in markdown/CSS (layout
  choice, big stat, simple table); otherwise leave an HTML comment placeholder like
  `<!-- TODO visual: bar chart of ARR growth -->` right where the asset belongs.
- Pick layouts intentionally: `cover` for title, `fact`/`statement` for big-number
  slides, `two-cols` for comparison, `section` for act breaks, `end` for the ask.

After writing, tell the user how to use it:

```bash
npx @slidev/cli slides.md --open        # present in browser
npx @slidev/cli build slides.md         # static HTML site (dist/)
npx @slidev/cli export slides.md --format pptx   # PPTX (also: pdf, png)
```

Export needs Playwright's Chromium the first time: `npx playwright install chromium`.
Don't run the export yourself unless asked — it downloads a browser and takes minutes.

## Quality Checklist

Before delivering, verify:
- [ ] Headlines read as a coherent story top-to-bottom (not just labels)
- [ ] One idea per slide
- [ ] Under 30 words per slide body
- [ ] Visuals suggested for every slide
- [ ] Speaker notes on every slide, in both spec and slides.md
- [ ] Clear ask on final content slide
- [ ] slides.md is valid Slidev: headmatter block, `---` separators, notes as trailing comments
