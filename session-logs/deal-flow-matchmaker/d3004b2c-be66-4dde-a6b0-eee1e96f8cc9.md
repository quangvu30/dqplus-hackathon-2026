# Session `d3004b2c-be66-4dde-a6b0-eee1e96f8cc9`
- **Project:** `deal-flow-matchmaker`
- **Span:** 2026-07-18T01:20:26.831Z → 2026-07-18T06:56:42.862Z
- **Source:** `/home/delus/.claude/projects/-home-delus-Documents-code-hackathon-deal-flow-matchmaker/d3004b2c-be66-4dde-a6b0-eee1e96f8cc9.jsonl`

---


### 🧑 User  ·  _2026-07-18T01:21:00.693Z_

i am going to build next steps for this system. there is 1 big question that need to answer: What is USP of this APP?

---

### 🤖 Assistant  ·  _2026-07-18T01:21:05.059Z_

Before I can give you a real answer on the USP, I need to understand what you've actually built. Let me read the docs and code you have.

---

### 🤖 Assistant  ·  _2026-07-18T01:21:06.089Z_

🔧 **Read** → `{"file_path": "/home/delus/Documents/code/hackathon/deal-flow-matchmaker/docs/OVERVIEW.md"}`

---

### 🧑 User  ·  _2026-07-18T01:21:06.103Z_

📎 _tool result_:
```
1	# Overview — What This Is
2	
3	**Deal-flow Matchmaker** connects Vietnamese startups with the right partners — investors,
4	corporations, universities, research institutions — and drafts the introduction email in
5	both Vietnamese and English. It's the answer to VAIC 2026 problem #135 (sponsor: National
6	Innovation Center).
7	
8	But the *way* it's built is the interesting part. This is an **AI agent data platform**.
9	This page explains what that means in one read. For the how, see
10	[`ARCHITECTURE.md`](ARCHITECTURE.md), [`AGENT_FLOWS.md`](AGENT_FLOWS.md), and
11	[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).
12	
13	## What is an "AI agent data platform"?
14	
15	A normal data pipeline is code that moves and transforms data through fixed steps. That
16	works when every step is a *precise* rule. It breaks the moment a step needs **judgment** —
17	"read this company's website and figure out what sector it's in," "explain why these two
18	organizations should talk," "write a warm email that invents no facts."
19	
20	An **AI agent data platform** solves this by splitting the work in two:
21	
22	| The **spine** (deterministic code) | The **agents** (AI) |
23	|---|---|
24	| Owns all data, order, and side effects | Do the fuzzy, judgment-heavy work |
25	| Never guesses; always correct | Never touch the database or the "truth" |
26	| Postgres, queues, retries, leases | Web research, extraction, ranking, writing |
27	| The part you can *trust* | The part that's *smart* |
28	
29	The two meet at one narrow, guarded seam: the spine hands an agent a prompt, the agent
30	replies with a **single block of validated JSON**, and the spine checks it against a schema
31	before it's allowed to change anything. If the agent misbehaves, the JSON fails validation
32	and the spine simply retries — nothing incorrect ever lands.
33	
34	```mermaid
35	flowchart LR
36	  subgraph spine["🧠 SPINE — deterministic code (the manager)"]
37	    direction TB
38	    SUP["Supervisor<br/>assigns work, retries, 
… [truncated 4045 chars — see raw .jsonl]
```

---

### 🤖 Assistant  ·  _2026-07-18T01:21:06.473Z_

🔧 **Read** → `{"file_path": "/home/delus/Documents/code/hackathon/deal-flow-matchmaker/docs/ARCHITECTURE.md"}`

---

### 🧑 User  ·  _2026-07-18T01:21:06.481Z_

📎 _tool result_:
```
1	# Architecture
2	
3	Deal-flow Matchmaker (problem #135, VAIC 2026 · NIC). This is the readable companion to
4	the full design of record in
5	[`superpowers/specs/2026-07-18-agent-data-platform-design.md`](superpowers/specs/2026-07-18-agent-data-platform-design.md).
6	Where they disagree, the spec wins.
7	
8	## 1. The one idea
9	
10	> A **deterministic Python spine** owns all state, orchestration, and I/O. Every **fuzzy**
11	> task (web research, extraction, ranking, drafting, verification) is pushed out to an
12	> **isolated LLM agent** that speaks a strict JSON contract. Postgres is the source of
13	> truth; the spine is a **reconciler**, not the record.
14	
15	Nothing that must be correct depends on a model behaving. Nothing that must be smart is
16	hard-coded. The seam between the two is a validated JSON block.
17	
18	## 2. Layer map
19	
20	```mermaid
21	flowchart TB
22	  subgraph clients["Clients"]
23	    CLI["scripts/bootstrap.py · scripts/outreach.py"]
24	    DASH["dashboard/index.html<br/>(polls every 3s)"]
25	  end
26	
27	  subgraph api["Read/Control API — api/app.py (FastAPI)"]
28	    EP["GET /entities /matches /sagas /jobs<br/>/events /workers /metrics /costs<br/>POST /runs (enqueue only)"]
29	  end
30	
31	  subgraph spine["The Spine (deterministic Python)"]
32	    SUP["Supervisor — reconciler loop<br/>spine/supervisor.py"]
33	    SAGA["Sagas: onboarding + outreach<br/>spine/sagas.py · spine/outreach.py"]
34	    MATCH["Matcher port + rule-filter<br/>spine/matcher/*"]
35	    STORE["Store — all SQL<br/>spine/store.py"]
36	    TRANS["RPC transport + launcher<br/>spine/transport.py"]
37	  end
38	
39	  subgraph agents["Agent runtimes (isolated processes, stdio JSON-RPC)"]
40	    FEY["feynman — crawler runtime<br/>enrich · extract (web tools)"]
41	    PI["pi — reasoning runtime<br/>match · draft · verify"]
42	  end
43	
44	  PG[("Postgres 16<br/>entities · edges · artifacts · matches<br/>jobs · events · saga_instances<br/>workers · llm_usage")]
45	
46	  CLI --> 
… [truncated 6797 chars — see raw .jsonl]
```

---

### 🤖 Assistant  ·  _2026-07-18T01:21:06.943Z_

🔧 **Read** → `{"file_path": "/home/delus/Documents/code/hackathon/deal-flow-matchmaker/docs/AGENT_FLOWS.md"}`

---

### 🧑 User  ·  _2026-07-18T01:21:06.951Z_

📎 _tool result_:
```
1	# AI Agents & Data Platform — How It Works
2	
3	How the agent data platform actually runs: the runtimes, the contract between spine and
4	agent, and the two sagas that turn a seed name into a verified, bilingual introduction.
5	Companion to [`ARCHITECTURE.md`](ARCHITECTURE.md); design of record is the
6	[spec](superpowers/specs/2026-07-18-agent-data-platform-design.md).
7	
8	## 1. Two runtimes, five agents
9	
10	Agents are **declared, not coded** — `agents/specs.yaml` maps each saga stage to a
11	runtime, skill, tool set, and pool size. The model is **pinned** across all of them to
12	`deepseek/deepseek-v4-flash`.
13	
14	| Agent | Runtime | Stage | Tools | Why |
15	|---|---|---|---|---|
16	| `enricher` | **feynman** | enrich | web_search, fetch_content, document_parse, read, write | Web research → provenance-rich profile + relationships |
17	| `extractor` | **feynman** | extract | fetch_content, document_parse, read, write | Normalize to canonical sectors, infer `looking_for` |
18	| `matcher` | **pi** | match | read | Rank + explain the filtered handful (LLM-as-judge) |
19	| `drafter` | **pi** | draft | read | Bilingual outreach email, non-time CTA |
20	| `verifier` | **pi** | verify | read | Strict compliance judge over the draft |
21	
22	**feynman = crawler runtime.** It ships web tools by default and discovers its skills from
23	`.feynman/agent/skills` via `--cwd`. Launched as `feynman chat --mode rpc --model M --cwd
24	<repo>` (it rejects `--session-id/--skill/--tools`; the spine carries the output contract
25	in the prompt instead).
26	
27	**pi = reasoning runtime.** Cheap, no web access. Launched as `pi --model M --mode rpc
28	--session-id W --skill P --tools ...`. Used for everything that reasons over data the
29	spine already has.
30	
31	Splitting the runtimes keeps the expensive web-capable process off ranking/drafting —
32	`pi` (draft+verify+match) is ~$0.39 of the reference run; `feynman` (enrich) dominates at
33	$1.17.
34	
35	## 2. The spine ↔ agent co
… [truncated 7798 chars — see raw .jsonl]
```

---

### 🤖 Assistant  ·  _2026-07-18T01:21:07.334Z_

🔧 **Read** → `{"file_path": "/home/delus/Documents/code/hackathon/deal-flow-matchmaker/README.md"}`

---

### 🧑 User  ·  _2026-07-18T01:21:07.343Z_

📎 _tool result_:
```
1	# Deal-flow Matchmaker
2	
3	Agent data platform for deal-flow matchmaking (problem #135, VAIC 2026 · sponsor NIC).
4	
5	A **deterministic Python spine** (supervisor + Postgres) owns storage, orchestration
6	(event-sourced sagas), a pluggable ranking `Matcher` port, and all I/O. The fuzzy work —
7	enrichment, extraction, match explanation, drafting, verification — runs inside isolated
8	**`feynman` / `pi`** agent runtimes driven over stdio JSON-RPC. See
9	`docs/superpowers/specs/2026-07-18-agent-data-platform-design.md` for the full design.
10	
11	## Documentation
12	
13	- [`docs/OVERVIEW.md`](docs/OVERVIEW.md) — **start here** — plain-language "what is an AI agent data platform" and what this does
14	- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layer map, components, data model, reliability & cost model
15	- [`docs/AGENT_FLOWS.md`](docs/AGENT_FLOWS.md) — the runtimes, the spine↔agent JSON contract, and both sagas end to end
16	- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — dashboard visual language (tokens, components, conventions)
17	- [`docs/superpowers/specs/2026-07-18-agent-data-platform-design.md`](docs/superpowers/specs/2026-07-18-agent-data-platform-design.md) — full design of record
18	
19	## Prerequisites
20	
21	- [`uv`](https://docs.astral.sh/uv/) (Python 3.12+)
22	- Docker + Docker Compose (Postgres 16)
23	- Host agent auth for the pooled runtimes: `~/.pi` and `~/.feynman` (a DeepSeek key —
24	  `deepseek/deepseek-v4-flash` is the pinned model). The transport lifts
25	  `DEEPSEEK_API_KEY` out of host auth if it isn't already exported.
26	
27	Agent-driven stages cost real LLM calls. The supervisor is pinned to `deepseek-v4-flash`
28	with a global concurrency cap (`MAX_CONCURRENCY`) to bound spend.
29	
30	## Configuration
31	
32	Copy `.env.example` to `.env` and adjust:
33	
34	| Var | Default | Purpose |
35	|-----|---------|---------|
36	| `DATABASE_URL` | `postgres://dealflow:[REDACTED:db-password]@localhost:5432/dealflow` | Postgres DSN |
37	| `AGENT_MODE
… [truncated 5551 chars — see raw .jsonl]
```

---

### 🤖 Assistant  ·  _2026-07-18T01:21:53.289Z_

I've read the full system. Here's my honest read on your USP question — it's the right question to be stuck on, because right now the app has **two different USPs pointed at two different audiences**, and they aren't the same thing.

## The two candidate USPs you actually have

**1. The engineering USP (what your docs are proud of):**
"An AI agent data platform" — deterministic spine + isolated agents, provenance schema, $1.67 for 57 entities, crash-recoverable, swappable Matcher port. This is genuinely well-built and it impresses *judges and engineers*.

**2. The product USP (what an NIC user actually buys):**
"Connects VN startups with the right partners and drafts the intro." This is what the sponsor's problem #135 asks for.

The trap: your docs lead with #1, but #1 is **infrastructure, not a USP**. A user doesn't care about your reconciler loop. And #2 as stated is *table stakes* — "AI matches startups to investors and writes an email" describes Crunchbase copilots, every accelerator tool, and literally ChatGPT. LLM ranking is not a moat.

## The one thing that is actually defensible

The sharp, honest USP is the intersection of both — the thing a generic "ChatGPT, find me investors" **cannot** claim:

> **Matchmaking you can trust.** Every fact behind every match carries the source URL an agent actually visited; anything it can't find is marked "unavailable" instead of invented; and every draft email is fact-checked by a second agent and *rejected* if it hallucinates.

That's the USP. Not "AI matchmaking" — **verifiable, no-hallucination matchmaking in a trust-sensitive, government-adjacent context.** NIC cannot forward a startup an intro built on made-up facts. You've made "correctness" a visible product feature (source ↗ links, confidence, the verify gate). That's rare and it's the story.

Two supporting differentiators that make it credible, not generic:
- **Vietnam-native + bilingual EN/VI** — shared VN/EN sector normalization, country-aware language choice
… [truncated 1023 chars — see raw .jsonl]

---

### 🤖 Assistant  ·  _2026-07-18T01:21:59.237Z_

🔧 **AskUserQuestion** → `{"questions": [{"question": "Which USP do you want to lead with and build the next steps around? This determines the roadmap.", "header": "Lead USP", "multiSelect": false, "options": [{"label": "Trust / no-hallucination", "description": "Position as \"verifiable matchmaking\" — every match sourced, every draft machine-verified. Next steps deepen provenance & the verify gate. Safest bet: builds on what's already your strongest, most-differentiated asset, and fits the NIC/government trust context."}, {"label": "Warm-intro graph", "description": "Position as \"who can introduce you\" — pathfinding over the relationship graph you already capture. Next steps build GraphRAG/pathfinding. Highest-ceiling moat, but more to build and the graph edges need to be dense enough to be useful."}, {"label": "Agent data platform", "description": "Position the reusable spine+agents infra as the product; matchmaking is the reference demo. Impresses engineers/judges, but weakest as a user-facing USP and hardest to sell to NIC."}, {"label": "Trust + graph combined", "description": "\"Verifiable warm-intro matchmaking\" — sourced matches AND intro pathfinding. Strongest narrative, but widest scope; risk of doing neither fully in hackathon time."}]}]}`

---

### 🧑 User  ·  _2026-07-18T06:50:17.463Z_

📎 _tool result_:
```
Your questions have been answered: "Which USP do you want to lead with and build the next steps around? This determines the roadmap."="Trust / no-hallucination". You can now continue with these answers in mind.
```

---

### 🤖 Assistant  ·  _2026-07-18T06:50:42.016Z_

Got it — USP = unique selling point, and you've picked **trust / no-hallucination** as the one to lead with. That's the right call: it's already your strongest asset and it's the one thing generic LLM tooling structurally can't claim.

So let me make it concrete. Right now "trust" is *implemented* (provenance schema, verify gate) but it's mostly **invisible and unmeasured**. To make it your USP, the next steps have to make it **visible, measurable, and undeniable**. Here's the roadmap I'd build, in priority order:

## 1. Make trust visible — a "Trust Panel" per match *(highest leverage, lowest effort)*
Right now the source links are buried in field drill-downs. Elevate trust to a first-class UI object on every match:
- **Grounding score** — % of claims in the draft that map to a cited `source_url`.
- **What got rejected** — surface the verify gate's *failures*, not just passes. "Draft rejected 2× for inventing a funding figure → corrected." A tool that shows you what it *refused to send* is dramatically more trustworthy than one that only shows successes.
- **Confidence + freshness** per field (you already store confidence; add "as of" date).

This is the demo moment. When you show NIC "here's the fact, here's the URL, here's the hallucination we caught and killed," you've won the trust argument on screen.

## 2. Make trust measurable — a verification scorecard
Trust claims need numbers or they're marketing. Add aggregate metrics to `/metrics`:
- Verifier catch-rate (drafts rejected / total), avg attempts-to-pass, dead-letter rate.
- Provenance coverage (fields with real `source_url` vs `unavailable`) — you already report 23/25; make it live.
- This turns "we don't hallucinate" into "**X% of drafts fail our fact-check before a human ever sees them, and here's the trend.**"

## 3. Make trust adversarial — harden the verify gate
Your verifier is a single `pi` judge over 4 checks. For a *trust* USP, that's the crown jewel and currently the weakest link (one model, one 
… [truncated 1385 chars — see raw .jsonl]

---

### 🧑 User  ·  _2026-07-18T06:53:18.231Z_

2 unique selling points:
1. AI Matching exact / most correct result
2. Story telling : Startup VN go to the world. 
Mark it to the readme

---

### 🤖 Assistant  ·  _2026-07-18T06:53:32.877Z_

🔧 **Edit** → `{"replace_all": false, "file_path": "/home/delus/Documents/code/hackathon/deal-flow-matchmaker/README.md", "old_string": "A **deterministic Python spine** (supervisor + Postgres) owns storage, orchestration\n(event-sourced sagas), a pluggable ranking `Matcher` port, and all I/O. The fuzzy work —\nenrichment, extraction, match explanation, drafting, verification — runs inside isolated\n**`feynman` / `pi`** agent runtimes driven over stdio JSON-RPC. See\n`docs/superpowers/specs/2026-07-18-agent-data-platform-design.md` for the full design.\n\n## Documentation", "new_string": "A **deterministic Python spine** (supervisor + Postgres) owns storage, orchestration\n(event-sourced sagas), a pluggable ranking `Matcher` port, and all I/O. The fuzzy work —\nenrichment, extraction, match explanation, drafting, verification — runs inside isolated\n**`feynman` / `pi`** agent runtimes driven over stdio JSON-RPC. See\n`docs/superpowers/specs/2026-07-18-agent-data-platform-design.md` for the full design.\n\n## Unique selling points\n\n1. **AI matching you can trust — the exact, most-correct result.** Not \"an AI guessed a\n   list.\" Every match is grounded in a real, cited source (each fact carries the\n   `source_url` an agent actually visited; unfound facts are marked `unavailable`, never\n   invented), and every draft is fact-checked by a second agent that *rejects* anything\n   hallucinated. The output is the correct match with the evidence to prove it.\n\n2. **Storytelling: Vietnamese startups go to the world.** Each match ships a ready-to-send\n   introduction in **both Vietnamese and English**, with a rationale that tells the\n   startup's story to the right global partner — investor, corporation, university, or\n   research institution. It turns a bare company name into a credible pitch that crosses\n   the language and context gap between VN founders and the world.\n\n## Documentation"}`

---

### 🧑 User  ·  _2026-07-18T06:53:32.935Z_

📎 _tool result_:
```
The file /home/delus/Documents/code/hackathon/deal-flow-matchmaker/README.md has been updated successfully. (note: the file had been modified on disk since you last read it — the edit applied cleanly, but the file contains other changes not in your context. Read it before edits that depend on surrounding content.)
```

---

### 🤖 Assistant  ·  _2026-07-18T06:53:39.681Z_

Done — added a **Unique selling points** section to the README, right under the intro:

1. **AI matching you can trust — the exact, most-correct result** — framed around your grounding + verify-gate advantage so "correct" is backed by evidence, not just asserted.
2. **Storytelling: Vietnamese startups go to the world** — the bilingual EN/VI intro that carries the startup's story to global partners.

I kept both phrased as differentiators (why *this* app vs. a generic LLM matcher) rather than plain feature descriptions.

One heads-up: the tool reported the README had **other changes on disk** that weren't in my context — my edit applied cleanly, but you may have unsaved/parallel edits elsewhere in the file. Worth a quick `git diff README.md` before you commit to make sure nothing collided.
