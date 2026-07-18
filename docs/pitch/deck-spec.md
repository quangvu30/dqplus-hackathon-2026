# Pitch Deck: VietNexus — VAIC 2026 Judges Pitch

**Assumptions**: 5-minute judging slot at VAIC 2026 (challenge #135, Deal-flow Matchmaker,
sponsored by NIC); a live demo or screenshots are available from https://dqplus.ddns.net;
team names/roles were not provided and are left as bracketed placeholders on the ask slide.
All product and roadmap claims come from `docs/OVERVIEW.md`, `docs/ROADMAP.md`, and
`ai-data-platform/docs/OVERVIEW.md` — nothing is invented.

## Slide 1: Title

**Headline**: VietNexus — the matchmaker for Vietnam's innovation economy
**Body**:
- VAIC 2026 · Challenge #135 "Deal-flow Matchmaker" · sponsored by NIC
- Live now: dqplus.ddns.net
**Visual**: Logo + tagline over a subtle network-graph motif; the live URL prominent.
**Speaker notes**: Everyone in this room knows fundraising in Vietnam runs on introductions. We spent this hackathon building the introduction machine — and it's already live. I'll show you the problem, what we shipped, and why the way we built it matters.

## Slide 2: Problem

**Headline**: Good companies don't get funded, because deal-flow runs on who you know
**Body**:
- Founders spray-and-pray investors — and get ignored
- Investors drown in pitches that don't fit their thesis
- The language gap hides Vietnamese startups from global capital
**Visual**: Three-column split: founder / investor / international partner, each with a broken connection line.
**Speaker notes**: Matching today is slow, manual, and network-bound. Founders can't tell which investors actually fit their industry, stage, and check size, so they blast everyone. Investors miss great companies that simply aren't in their circle. And a promising Vietnamese startup usually has no convincing English pitch, so international money never hears its story. Good companies don't get funded; good money doesn't reach them.

## Slide 3: Solution

**Headline**: Tell VietNexus who you are — it returns a ranked shortlist, the why, and the intro email
**Body**:
- AI reads your profile into a structured summary
- Ranks the other side of the market: meaning + industry, stage, check size
- Every match explains itself in plain language
- One click → a ready-to-send introduction
**Visual**: Product screenshot of the ranked match list with its reason chips ("same industry: fintech · matches your stage: seed").
**Speaker notes**: The journey is five steps: sign up, the AI structures your profile, we rank everyone on the other side of the market, and every match comes with plain-language reasons — same industry, right stage, invests in your region — so you trust the list instead of guessing. Then one click gives you a ready-to-send intro. That's a cold-start problem turned into a warm introduction.

## Slide 4: How it works (differentiator)

**Headline**: A deterministic spine commands AI agents — so nothing made-up ever lands
**Body**:
- Agents crawl, extract, rank, draft; the spine validates every output before it touches the database
- Semantic RAG (pgvector) + GraphRAG relationship signals
- Every fact keeps its source; a second AI fact-checks each draft, in English and Vietnamese
**Visual**: The spine/agents mermaid diagram: supervisor + Postgres on one side, agent workers on the other, meeting at a "schema valid?" gate.
**Speaker notes**: The interesting part is how it's built. Deterministic code — the spine — owns all data and side effects. AI agents do only the judgment work: crawling the web, extracting, ranking, drafting. They meet at one guarded seam: an agent returns a single block of JSON, and the spine schema-validates it before anything lands. Matching runs on multilingual embeddings over a pgvector corpus plus graph relationships. And every intro email is drafted bilingually, then fact-checked by a second AI against sourced evidence. Judges hear "AI" all day — our answer to hallucination is architectural, not a prompt.

## Slide 5: Live today

**Headline**: Not a prototype — the full loop is in production right now
**Body**:
- Sign up → profile → AI extraction → ranked, explained matches: live at dqplus.ddns.net
- Zero-downtime rolling deploys; end-to-end test suites on a real vector database
- Tabs we haven't built say "coming soon" — no fake results
**Visual**: Big URL / QR code; optionally a screen-recording still of the live match flow.
**Speaker notes**: This isn't a slideware demo. The whole loop — register, onboard, AI extraction, ranked matches with reasons, outreach draft — runs end-to-end on the public internet today. We deploy with zero downtime and test every service end-to-end against a real database, no mocks. And where the product isn't finished — customers, partners, talent matching — the app says so honestly instead of pretending. You can try it from your phone right now.

## Slide 6: Roadmap

**Headline**: From matching demo to Innovation OS in three phases
**Body**:
- Now: investor matching live end-to-end
- Q4 2026: customers, partners & talent matching; real hosting; mobile on live APIs
- 2027: learning-to-rank from outcomes; GraphRAG-ranked intros; cohort mode for NIC programs
**Visual**: Three-step horizontal timeline with the current phase highlighted.
**Speaker notes**: We're deliberate about sequencing. First, demo-hard: wire the fact-checked bilingual drafts into the app and add CI. Next quarter, the other three connection types light up — the entity model already supports corporations, universities, and research institutes — plus real hosting. In 2027 the platform starts learning: match outcomes tune the ranking, relationship graphs feed the rationale, and accelerators or government programs run their own cohorts on the same spine. That's when it earns the name Innovation OS.

## Slide 7: The Ask

**Headline**: Give us a cohort — pilot VietNexus with NIC's next program
**Body**:
- Pilot: one NIC accelerator cohort matched through VietNexus
- Intros to ecosystem partners feeding the entity corpus
- Team: [names & roles — fill in before presenting]
**Visual**: Single bold ask line; small team strip with photos at the bottom.
**Speaker notes**: Here's what we're asking for. Beyond the challenge itself: give us one real cohort. Put a NIC program's startups and partners through VietNexus and measure the introductions that convert. The platform is live, the architecture doesn't hallucinate, and the roadmap is honest. Vietnam's ecosystem doesn't need another directory — it needs a matchmaker that never sleeps. We built it. Thank you.
