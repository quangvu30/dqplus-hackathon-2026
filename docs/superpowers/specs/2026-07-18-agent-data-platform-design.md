# Agent Data Platform for Deal-flow Matchmaking — Design Spec

- **Date:** 2026-07-18
- **Problem:** #135 Deal-flow Matchmaker (VAIC 2026, sponsor NIC)
- **Status:** Design approved (Sections 1–5), pending spec review → implementation plan

---

## 1. Summary

Build the deal-flow matchmaker (problem #135) as a **data platform whose workers are AI agent runtimes**. The compute at the fuzzy edges — crawling, enrichment, extraction, match explanation, draft generation, verification — runs inside **isolated `feynman` and `pi` processes** driven over a **stdio JSON-RPC** protocol. A **deterministic Python spine** (supervisor + Postgres) owns storage, orchestration, a pluggable ranking `Matcher` (v1 LLM-as-judge; embedding/Graph-RAG later), and all irreversible I/O.

The pipeline is modeled as **orchestration sagas** whose event log lives in Postgres (no message queue). The system is **fully automated — no human-in-the-loop** — so a **data-quality/provenance audit** is the safeguard against hallucinated data.

### North Star (definition of done)

A cold `docker compose up postgres` → start supervisor → seed/trigger produces:

- **A1** ≥10 real NIC startups onboarded (enriched profile + relationships in `edges`; every **populated** field carries a `source_url`, unfound fields marked `confidence:"unavailable"`). *(A1 wording per R8.)*
- **A2** ≥15 real partners onboarded across **all four types** — investors + corporations + universities/research institutions — with provenance. (Seed: 20 investors, 7 corporations, 5 universities/research.)
- **A3** Every startup has ranked matches spanning the partner types its `looking_for` implies: top-K partners + fit score + LLM rationale + verified VI/EN draft (via `LlmJudgeMatcher`).
- **A4** A simple dashboard lists entities; clicking a startup shows its ranked matches + rationale + draft.
- **A5** The whole thing is reproducible from zero via one scripted run.

Numbers are targets, adjustable.

---

## 2. Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| D1 | Scope | Serious foundation, demo-first |
| D2 | Agent boundary | **Agents at the edges, deterministic code at the spine** |
| D3 | RPC topology | **Star** — supervisor ↔ each agent; agents never talk directly |
| D4 | Runtime split | **feynman** for crawlers (web tools), **pi** for match/draft/verify |
| D5 | Agent lifecycle | **Long-lived RPC pools** for both runtimes, with per-job session hygiene |
| D6 | Coordination | **Orchestration saga**, event-sourced in **Postgres** (no MQ) |
| D7 | Human approval | **Removed** — fully automated; provenance audit is the safeguard |
| D8 | Side effects | `send`/`schedule` **deferred to WIP**; pipeline currently side-effect-free |
| D9 | Infra | **Docker Compose for `postgres` + `api`**; supervisor+pools on host; pi/feynman containerization supported later via a Launcher seam |
| D10 | Ranking | Behind a **`Matcher` port**. v1 = `LlmJudgeMatcher` (no embeddings). `EmbeddingMatcher` / `GraphRagMatcher` are pluggable later — one-line config swap. Relationships captured in an `edges` table from day 1 so the Graph-RAG swap is data-ready. |

---

## 3. Architecture

Four layers:

| Layer | Contents | Agent or code |
|---|---|---|
| **Spine** | Supervisor (reconciler, scheduler, DAG engine, pool manager), RPC transport | deterministic Python |
| **Store** | Postgres (entities, edges, artifacts, matches, jobs, events, saga_instances, workers; +pgvector later) | code |
| **Agent fleet** | isolated feynman/pi runtimes running the 3 domain skills + a verify skill | agents |
| **Edges** | data sources in; email/calendar out (WIP) | external |

```
                    ┌──────────────── SPINE (deterministic Python) ────────────────┐
 data sources ───►  │  Supervisor ──► jobs (SKIP LOCKED) ──► RPC transport ──► pools │
 (NIC lists, web)   │      ▲                                          │              │
                    │      │   Postgres (blackboard + event log + graph)  ◄─ r/w ──┘ │
                    │      └──── DAG advances on artifact/event writes ──────────────│
                    └───────────────────────────────────────────────────────────────┘
   Agent pools (star RPC to supervisor):
   • feynman  → enrich / extract           (web tools)
   • pi       → draft / verify             (skills, cheap)
   Deterministic spine steps: ingest, link (profile+edges), rule-filter, match via Matcher port, (send/schedule = WIP)
```

The DB **is** the blackboard: agents read an input artifact and write an output artifact; the supervisor reacts to writes and advances the stage DAG. Agents coordinate only through shared state.

---

## 4. Agent Runtime Contract

An agent is a declarative spec the supervisor knows how to launch:

```python
AgentSpec(
  name="enricher", runtime="feynman", skill="entity-enrichment",
  tools=["web_search","fetch_content","document_parse","write","read"],
  lifecycle="pool", pool_size=2,
  model="deepseek/deepseek-v4-flash",  # PINNED: only funded/allowed model (see §8, §11)
)
```

### RPC protocol (verified on both `pi` and `feynman`)

Launch: `pi --model deepseek/deepseek-v4-flash --mode rpc --session-id <w> --skill <path> --tools <…>`.
Transport must **keep stdin open** for the life of the worker (piping one line + EOF kills the process before the reply streams).

```
→  {"id": N, "type": "prompt", "message": "<task text>"}
←  {"id": N, "type": "response", "command": "prompt", "success": true}   # ACK ONLY — not completion
←  {"type":"agent_start"} {"type":"turn_start"}
←  {"type":"message_start"|"message_end", ...}                          # user + assistant messages
←  {"type":"turn_end",  "message": {role:"assistant", content:[{text}], usage:{...cost}, stopReason}}
←  {"type":"agent_end", "messages":[...], "willRetry": <bool>}
←  ( {"type":"auto_retry_start"} … loop … {"type":"auto_retry_end","success":<bool>} )?   # pi's own retry
←  {"type":"agent_settled"}                                             # TERMINAL
```

**Transport rules (corrected from preflight — this is the #1 thing agents must get right):**
- Request discriminator is `type`; content field is **`message`** (verified — `text`/`prompt`/`content` fail).
- The `{id, success:true}` line is an **acknowledgment**, NOT completion. Do **not** treat it as done.
- **Completion = `{"type":"agent_settled"}`.** Assistant output lives in `turn_end.message.content[].text` and `agent_end.messages[]`. Per-turn `usage.cost` is available for telemetry.
- pi has **built-in auto-retry** (3× exponential backoff) on transient/model errors — the supervisor should NOT duplicate this; it only handles process death + lease reclaim. A final failure ends `auto_retry_end.success=false` then `agent_settled`.
- **Ignore** `extension_ui_request` / `setWidget` event lines (feynman emits them).
- Errors surface as `turn_end.message.stopReason="error"` + `errorMessage` (e.g. `429 Insufficient balance`) — detect and route to job failure after pi's own retries exhaust.

### Isolation & lifecycle

- Each agent = its own OS process, own `--session-dir`/`--cwd`, own tool allowlist, own model budget.
- **Both runtimes are long-lived RPC pools.** Warm feynman sessions accumulate context, so the supervisor performs a **per-job session reset** (a new-session/clear RPC command, identified in build; worst case cycle the process every N jobs). Tracked via `workers.jobs_since_reset`.
- A crashed/runaway agent is killed and its job requeued without touching the spine or siblings.

### Launcher seam (host now, container later)

```python
class RuntimeLauncher(Protocol):
    async def spawn(self, spec: AgentSpec) -> RpcChannel: ...
# now:   LocalProcessLauncher (host subprocess, host ~/.pi & ~/.feynman auth)
# later: ContainerLauncher    (same RpcChannel, runtime in a container)
```
The supervisor only sees `RpcChannel`; where the runtime runs is a config swap.

---

## 5. The Spine

### 5.1 Storage schema (Postgres + pgvector)

```sql
-- pgvector NOT required for v1 (LlmJudgeMatcher). Enable + add the embedding column
-- only when EmbeddingMatcher is plugged in later.

-- unified startups + partners
CREATE TABLE entities (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,          -- startup | investor | corporation | university | research_institution
  name          TEXT NOT NULL,
  profile       JSONB NOT NULL,          -- provenance-tracked fields ({value, source_url, confidence})
  status        TEXT NOT NULL DEFAULT 'seeded',  -- seeded | enriching | ready
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
  -- embedding vector(N)  -- added later by EmbeddingMatcher migration; dim derived from model
);

-- relationships graph (captured from enrichment output from day 1; v1 matcher ignores it,
-- GraphRagMatcher + connection-viz consume it later)
CREATE TABLE edges (
  id          BIGSERIAL PRIMARY KEY,
  src_id      TEXT NOT NULL,            -- entity id (may reference a not-yet-onboarded name)
  dst_id      TEXT NOT NULL,
  kind        TEXT NOT NULL,            -- invested_in | founded_by_alumni_of | pilot_with | co_invested | same_sector
  source_url  TEXT,                     -- provenance (same discipline as profiles)
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (src_id, dst_id, kind)
);

-- raw agent outputs (blackboard cells / audit trail)
CREATE TABLE artifacts (
  id          BIGSERIAL PRIMARY KEY,
  saga_id     TEXT NOT NULL,
  step        TEXT NOT NULL,
  entity_id   TEXT,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- domain results
CREATE TABLE matches (
  id             BIGSERIAL PRIMARY KEY,
  startup_id     TEXT REFERENCES entities(id),
  partner_id     TEXT REFERENCES entities(id),
  composite      REAL, semantic REAL, sector_overlap REAL,
  rationale_en   TEXT, rationale_vi TEXT,
  draft_en       TEXT, draft_vi TEXT,
  status         TEXT NOT NULL DEFAULT 'ranked',  -- ranked | draft_ready
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (startup_id, partner_id)
);

-- commands (the queue)
CREATE TABLE jobs (
  id               BIGSERIAL PRIMARY KEY,
  saga_id          TEXT NOT NULL,
  stage            TEXT NOT NULL,          -- enrich | extract | link | filter | match | draft | verify
  agent            TEXT,                   -- agent name (null for code stages)
  input_ref        JSONB,
  status           TEXT NOT NULL DEFAULT 'ready', -- ready | leased | done | failed | dead
  attempts         INT NOT NULL DEFAULT 0,
  leased_by        TEXT,
  lease_expires_at TIMESTAMPTZ,
  UNIQUE (saga_id, stage)                  -- idempotency key
);
CREATE INDEX ON jobs (status, stage);

-- append-only event log (source of truth)
CREATE TABLE events (
  id          BIGSERIAL PRIMARY KEY,
  saga_id     TEXT NOT NULL,
  seq         INT NOT NULL,
  kind        TEXT NOT NULL,               -- EntityReady | MatchesRanked | DraftReady | Verified | ...
  payload     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (saga_id, seq)
);

-- folded projection (fast queries; rebuildable from events)
CREATE TABLE saga_instances (
  saga_id       TEXT PRIMARY KEY,
  type          TEXT NOT NULL,             -- onboarding | outreach
  subject_id    TEXT,                      -- entity/startup id
  current_step  TEXT,
  status        TEXT NOT NULL DEFAULT 'running',  -- running | done | failed
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- control plane: worker registry
CREATE TABLE workers (
  worker_id         TEXT PRIMARY KEY,
  agent_type        TEXT NOT NULL,
  runtime           TEXT NOT NULL,         -- pi | feynman
  pid               INT,
  boot_epoch        TEXT NOT NULL,         -- supervisor boot id (orphan detection)
  status            TEXT NOT NULL,         -- starting | idle | busy | draining | dead
  current_job_id    BIGINT,
  jobs_since_reset  INT NOT NULL DEFAULT 0,
  restart_count     INT NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ
);
```

### 5.2 Supervisor (single async process)

1. **Pool manager** — spawns/monitors RPC pools via the Launcher, health-checks, restarts on crash, enforces session hygiene.
2. **Scheduler** — `SELECT … FOR UPDATE SKIP LOCKED` to lease ready jobs; assigns to a free worker of the right type; sends the `message`; awaits terminal response; persists artifact + event.
3. **DAG engine** — when a stage's event lands, enqueues the next stage's jobs (via `LISTEN/NOTIFY`).
4. **Compensation registry** — empty now (no side effects); wakes when send/schedule land.

### 5.3 Control plane / data plane (crash recovery)

Postgres is the source of truth for **desired + leased** state; the supervisor is a **reconciler**, not the record.

- **Leases with expiry**: a crashed worker's job auto-expires and is reclaimed.
- **Heartbeats** (coarse, every 3–5s): missed → mark `dead` → lease expires → job requeued → replacement spawned.
- **Reconcile on boot**: read non-dead workers; check `pid` liveness vs `boot_epoch`; adopt survivors, kill prior-epoch orphans, mark the rest dead and reclaim leases.
- Persist **milestones** only (job leased, artifact written, worker died) — never token-level streams.

### 5.4 Saga model (Postgres-as-log, no MQ)

State transition + event emission are one transaction — eliminates the dual-write problem:

```sql
BEGIN;
  UPDATE saga_instances SET current_step='match', status='running' WHERE saga_id=$1;
  INSERT INTO events (saga_id, seq, kind, payload) VALUES ($1,$2,'ExtractCompleted',$3);
  INSERT INTO jobs   (saga_id, stage, status)      VALUES ($1,'match','ready');
COMMIT;
```

- **At-least-once + idempotency**: `UNIQUE(saga_id, stage)` guards double-dispatch. There is no exactly-once; effectively-once = at-least-once execution + idempotent effects.
- Competing consumers via `SKIP LOCKED`; push wake-ups via `LISTEN/NOTIFY`.

---

## 6. Data Flow (two sagas)

### Saga 1 — Onboarding (per entity) · forward-recovery only

```
ingest ─► enrich ─► extract ─► link ─► EntityReady
(code)   feynman    feynman    (code: upsert profile + edges)
```
Pure computation. Any step fails → retry forward. No compensations. `link` persists the entity profile and writes any relationships the enrichment surfaced into `edges` (graph-ready). No embedding step in v1.

### Saga 2 — Outreach (per startup) · forward-recovery only (currently)

```
rule-filter ─► match+explain ─► draft ─► verify ─► OutreachReady (matches.status='draft_ready')
(code)         Matcher port      (pi)     (pi: LLM-judge)
               (v1: pi LlmJudge)
```

| Step | Actor | Success event | On failure |
|---|---|---|---|
| rule-filter | code (sector/stage/geo/purpose) | — | retry forward |
| match+explain | **`Matcher` port** — v1 `LlmJudgeMatcher` (pi ranks + explains the filtered handful in one call) | `MatchesRanked` | retry forward |
| draft | pi · dealflow-match §3–4 prompts | `DraftReady` | retry forward |
| verify | pi · draft-verify (checks facts/PII/language, no invented times) | `Verified` | reject → retry draft w/ feedback (max N) → dead-letter |

The `Matcher` port makes ranking pluggable (D10): `EmbeddingMatcher` and `GraphRagMatcher` drop in later with no saga change.

**WIP seam (deferred):** `send` (Gmail API, `UNIQUE(saga_id,'send')` guard, compensation = retraction) and `schedule` (Calendar API, compensation = event delete). The compensation registry and `dry_run` adapter toggle are designed in but not wired.

---

## 7. Skill Wiring

The 3 existing skills in `.feynman/agent/skills/` are the agents' instruction sets for fuzzy work; their deterministic parts migrate to the spine.

| Step | Runtime + skill | Deterministic parts → spine |
|---|---|---|
| enrich | feynman · `entity-enrichment` | — |
| extract | feynman · `profile-extraction` | — |
| link | **code** | upsert profile + write relationships to `edges` |
| rule-filter | **code** | dealflow-match Stage 1 |
| match+explain | pi via `Matcher` port (v1 `LlmJudgeMatcher`) · `dealflow-match` §3 | Stage 2 becomes an LLM-judge call, not SBERT |
| draft | pi · `dealflow-match` §4 | agent uses the skill's email prompts |
| verify | pi · `draft-verify` (new tiny skill) | — |

`entity-enrichment` mandates `source_url` per field — this is what makes the provenance audit (§9) possible.

---

## 8. Tech Stack & Repo Layout

| Concern | Choice |
|---|---|
| Language / deps | Python 3.12, **uv** |
| Supervisor | `asyncio` |
| Store | Postgres 16 (plain `postgres:16` for v1; `pgvector/pgvector:pg16` only when EmbeddingMatcher lands) |
| DB driver | `asyncpg` (LISTEN/NOTIFY, SKIP LOCKED) |
| Ranking | **`Matcher` port** — v1 `LlmJudgeMatcher` (pi, deepseek-flash). No embeddings/pgvector in v1. |
| Embeddings (later) | `EmbeddingMatcher`: `sentence-transformers` · `keepitreal/vietnamese-sbert` — derive vector dim at model load (likely 768); migration reads dim from config, never hardcodes. |
| Agent model | **`deepseek/deepseek-v4-flash`** pinned for all agents (zai has no balance; deepseek-v4-pro not used for now) |
| Agent runtimes | pi + feynman via `--mode rpc` (stdin held open; terminal = `agent_settled`) |
| API / dashboard | FastAPI (+ HTMX or thin Next.js) |
| Observability | `structlog` (JSON logs + correlation IDs); `llm_usage` table for cost; `/metrics` for pool/queue health (§13) |
| Migrations | plain SQL |

```
deal-flow-matchmaker/
├─ spine/{supervisor,transport,pools,sagas,store}.py
│  └─ matcher/{__init__,llm_judge}.py   # Matcher port + v1 adapter; embedding/graphrag added later
├─ agents/specs.yaml            # declarative agent registry
├─ api/app.py                   # FastAPI: /jobs /events /sagas /workers /entities /matches /metrics /costs
├─ spine/telemetry.py           # structlog config, correlation IDs, llm_usage capture
├─ dashboard/                   # minimal live view
├─ migrations/*.sql
├─ seed/                        # startups.json (25) + investors.json (20) + corporations.json (7) + universities.json (5)
├─ runtime/Dockerfile           # STUB: pi+feynman baked (wired later)
├─ docker-compose.yml           # postgres + api
├─ .feynman/agent/skills/       # entity-enrichment · profile-extraction · dealflow-match (+ draft-verify)
└─ pyproject.toml
```

### docker-compose.yml (now: postgres + api)

```yaml
services:
  postgres:
    image: postgres:16      # swap to pgvector/pgvector:pg16 when EmbeddingMatcher lands
    environment: {POSTGRES_DB: dealflow, POSTGRES_USER: dealflow, POSTGRES_PASSWORD: dealflow}
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d:ro
    healthcheck: {test: ["CMD-SHELL","pg_isready -U dealflow"], interval: 5s, retries: 10}
  api:
    build: ./api
    depends_on: {postgres: {condition: service_healthy}}
    environment: {DATABASE_URL: "postgres://dealflow:dealflow@postgres:5432/dealflow"}
    ports: ["8000:8000"]
  # agent-runtime:   # profiles: [full] — WIP: bakes pi+feynman, mounts ~/.pi & ~/.feynman
volumes: {pgdata: {}}
```

Supervisor + agent pools run on **host** via `LocalProcessLauncher`, connecting to Postgres at `localhost:5432`.

---

## 9. Verification, Testing & Reviews

### Testing layers

| Layer | Scope | Asserted | Determinism |
|---|---|---|---|
| Unit | store, matcher, sagas, transport | lease acquire/expiry/reclaim; idempotency uniqueness; rule-filter correctness; `edges` upsert idempotency; event-fold→projection; RPC collect-by-id, terminal=`agent_settled`, ignore ui events | fully deterministic — **TDD** |
| RPC integration | real pi + feynman, cheap prompts | worker answers trivial prompt; feynman has `web_search`; **kill-mid-job → reclaimed + requeued** | deterministic control flow |
| Agent contract | enricher/extractor/drafter/verifier | JSON matches schema; **invariants**: no PII in angel profiles, no invented times/metrics, `source_url` present | schema + invariants |
| E2E acceptance | full pipeline on real seed | A1–A5 | counts asserted + eyeball |

Per team standards: **present test plan before code; TDD the deterministic spine.**

### Reviews (two gates)

1. **Code review** each phase — spine correctness (leases, idempotency, reconciliation).
2. **Data-quality / provenance audit** — *replaces the removed human gate.* Mechanically flag any onboarded field lacking `source_url` as suspect-hallucination; spot-check a sample against cited URLs. Fully-automated onboarding is trustworthy only if provably sourced.

### "Find investors in Vietnam" approach

Seed **real named partners across all four types** → feynman enriches each (reliable): 20 investors (Mekong Capital, Do Ventures, VinVentures, 500 Global VN, …), 7 corporations (FPT, Viettel, VinGroup, EVN, …), 5 universities/research (VNU, HUST, Phenikaa, VAST). An optional feynman **discovery agent** (web-search for more names) appends as a bonus, not the backbone. Seed files committed under `seed/`.

---

## 10. Build Sequence (tests + acceptance interleaved)

| Phase | Adds | Exit gate |
|---|---|---|
| **0 · Backbone** | compose Postgres, transport, pool, supervisor + unit tests (lease/idempotency/RPC framing) | trivial RPC round-trip persisted; crash-reclaim test green |
| **1 · Onboarding saga** | seed → feynman enrich/extract → code `link` (profile + edges) + contract tests | 3 real NIC startups onboarded w/ provenance + relationships in `edges` |
| **2 · Outreach saga** | rule-filter → `LlmJudgeMatcher` (pi) → pi draft → pi verify + invariant tests | startup → ranked+explained partners + verified draft |
| **3 · Dashboard + API + observability** | FastAPI + live view; structured logs w/ correlation IDs; `llm_usage` cost capture; `/metrics` + infra & cost panels | watch a full run advance on screen with live cost + pool health |
| **4 · Hardening** | crash/idempotency/session-hygiene suite | kill worker mid-job → no double-effect, auto-recovery |
| **5 · E2E ACCEPTANCE** | onboard full seed (25 startups + 32 partners across 4 types); run A1–A5; provenance audit; code review | **all of A1–A5 pass from a cold `docker compose up`** — the deliverable |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Agent model balance / rate limits | pinned to funded `deepseek-v4-flash`; small `pool_size` + global concurrency cap; rely on pi's built-in retry, route final 429s to job failure |
| Warm feynman session context bleed across crawl targets | per-job session reset; cycle process every N jobs |
| Fully-automated data may hallucinate | mandatory `source_url` + provenance audit gate |
| Orphaned agent processes after supervisor crash | `boot_epoch` tagging + kill prior-epoch orphans on reconcile |
| pi/feynman auth coupling blocks containerization | Launcher seam; host now, `ContainerLauncher` + mounted auth later |

---

## 12. WIP Seams (designed, not built)

- `send` (Gmail) + `schedule` (Calendar) steps, their compensations, and the `dry_run` adapter toggle.
- `ContainerLauncher` + `runtime/Dockerfile` + compose `agent-runtime` service (`profiles: [full]`).
- feynman discovery agent for open-ended investor discovery.
- **`EmbeddingMatcher`** (SBERT + pgvector) — plug into the `Matcher` port if partner count crosses ~1000.
- **`GraphRagMatcher`** + connection-visualization dashboard panel — consumes the `edges` table (built from day 1), proximity/path ranking (SocioLink-style). Pure addition, no saga/spine change.

---

## 13. Observability, Cost & Guardrails

Most of this is promoting substrate the design already has (`events`, `workers`, RPC `usage.cost`) into first-class features. Kept Postgres-native — no extra infra to run for the demo.

### 13.1 Tracing / structured logs

- **Correlation IDs on everything**: every log line and DB row carries `trace_id` (per top-level pipeline run), `saga_id`, `job_id`, `worker_id`. One agent call is fully reconstructable end-to-end.
- **Structured JSON logs** (structlog) to stdout + file — one event per line, machine-parseable.
- **`events` table = the durable trace** (already designed): step transitions, agent starts/ends, retries, failures. The dashboard's event-log stream reads from here.
- **Per-step timing** persisted (queued_at, leased_at, done_at) so latency per stage/agent is queryable.
- OpenTelemetry span export is a WIP seam (add an OTLP exporter later); not run for the demo.

### 13.2 LLM cost tracking

The RPC stream already carries `turn_end.message.usage` (`input`/`output`/`cache` tokens + `cost`). The transport captures it per turn into:

```sql
CREATE TABLE llm_usage (
  id           BIGSERIAL PRIMARY KEY,
  trace_id     TEXT, saga_id TEXT, job_id BIGINT,
  agent        TEXT NOT NULL, runtime TEXT, model TEXT,
  tokens_in    INT, tokens_out INT, cache_read INT, cache_write INT,
  cost_usd     NUMERIC(12,6),
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

Aggregate views: **cost per saga, per agent type, per model, per run**. Dashboard shows running total + cost-per-onboarded-entity + cost-per-match. Directly serves the cost-control concern of pinning `deepseek-flash`.

### 13.3 Infra monitoring

- **Pool health** from the `workers` table: live/idle/busy/dead counts, `restart_count`, `jobs_since_reset`, heartbeat age.
- **Queue health**: `jobs` depth by stage/status, lease-reclaim rate, dead-letter count.
- **DB health**: connection pool stats; compose already has a Postgres `healthcheck`.
- Exposed via `GET /metrics` (JSON; Prometheus text format = WIP) and a dashboard **infra panel**. A worker going dead or a queue backing up is visible at a glance.

### 13.4 Guardrails (deliberately light — agree they're mostly not needed)

Guardrails are already covered by existing mechanisms rather than a separate framework:

| Concern | Covered by |
|---|---|
| Hallucinated outreach content | `verify` step (LLM-as-judge) |
| Fabricated/unsourced data | mandatory `source_url` + provenance audit (§9) |
| Agent capability confinement | per-agent tool allowlists (a crawler can't write outside its job dir) |
| Runaway cost / rate limits | global concurrency cap + `pool_size` + `llm_usage` budget tracking |
| PII on individuals | enforced in `entity-enrichment` skill (`pii_blocked`) |

A dedicated policy-guardrail layer stays a **WIP seam** — added only if a real need appears. No extra guardrail work in v1.

---

## 14. Review Resolutions (pre-ultracode hardening)

An independent design review (2026-07-18) found gaps that would break the E2E run. Resolutions below are authoritative and refine earlier sections.

### Blockers

**R1 · Multi-stakeholder scope — RESOLVED (broadened).** Decision: v1 covers all four partner types. Seed now includes `seed/corporations.json` (7: FPT, Viettel, VinGroup, EVN, Heineken VN, Cốc Cốc, HDBank) and `seed/universities.json` (5: VNU, HUST, Phenikaa, VNU-HCM UIT, VAST — mix of `university` + `research_institution`). This restores problem #135's actual differentiator: startups matching corporations (pilots/partnership), universities/research (R&D collaboration), and investors (funding).

**R2 · Rule-filter must not collapse to zero.** Seed startups lack `stage`/`looking_for`, and raw sector tags won't set-intersect (`enterprise_ai` vs `ai`). Resolution:
- The deterministic filter treats **missing signals as pass-through** with a `low_confidence_filter` flag (never a hard drop); default `startup.looking_for=["funding"]` when unknown.
- Add a **bilingual sector normalization table** (`enterprise_ai|ai_agents → ai`; `clean_energy → cleantech`; `agritech`; `nông_nghiệp → agritech`; …); the filter matches on **normalized** tags.
- Resolve the deterministic-vs-LLM tension: **sector inference from free text happens in the `extract` agent stage** (writes normalized sectors into the profile); the code filter never calls an LLM.

**R3 · Agent→spine output contract (the load-bearing seam).** Agents do NOT hand off via files. The agent's **terminal message must be a single fenced ```json block conforming to a named per-stage schema** (`schemas/{enrich,extract,rank,draft,verify}.json`). The transport extracts + validates (jsonschema); on parse/validate failure → retry with a "return ONLY the JSON" reminder (max N) → dead-letter. The three existing skills' Output sections are **rewritten to emit JSON as the final message** (not write `outputs/*.json`). `write` tool remains for scratch only.

**R4 · Cold-boot scaffolding = first-class deliverables** (Phase 0–1, not implicit):
- `scripts/bootstrap.py` — load `seed/*.json` → upsert `entities` (`status='seeded'`) → create onboarding sagas → enqueue.
- Run trigger: `POST /runs` (+ a CLI equivalent).
- Supervisor entrypoint: `python -m spine.supervisor`.
- `api/Dockerfile` (compose `build: ./api` needs it).
- `.feynman/agent/skills/draft-verify/SKILL.md` — **create it** (LLM-as-judge; checks facts/PII/language/no-invented-times).

### Major

**R5 · Per-match job granularity.** Change job idempotency key to **`UNIQUE(saga_id, stage, target_id)`** (`target_id` = entity for onboarding, `partner_id` for per-match `draft`/`verify`). `rank` emits K candidate rows; `draft`/`verify` run as per-match sub-jobs. Verify→draft retry stores `verify_feedback JSONB` + `attempts` on the sub-job and re-arms it (`status='ready'`) — an explicit retry edge the DAG engine supports, not a new stage.

**R6 · Artifact uniqueness + lease window.** Add **`UNIQUE(saga_id, step, target_id)`** to `artifacts` (upsert latest-wins) so a reclaimed/double-run job can't create ambiguous rows. `lease_expires_at` must exceed pi's worst-case built-in retry window (2+4+8s backoff + turn time) → **lease ≥ 120s, configurable**. Note: the **supervisor writes heartbeats on the worker's behalf** (generic runtimes can't self-report), so a supervisor stall is undetectable without an external watchdog — external watchdog = WIP seam.

**R7 · Session reset — RESOLVED.** `{"type":"new_session"}` verified on pi (`success:true`). Supervisor issues it between jobs for pooled workers. D5 (long-lived pools) confirmed safe.

**R8 · A1 wording + seed footprint.** Reword **A1**: *"every **populated** field carries a `source_url`; unfound fields are marked `confidence:"unavailable"`, `source_url:null`."* Pre-vet seed: ~5 startups have near-zero public footprint (SHOES AGTECH, N2TP, Rongbient, esa, NanoFrontier) and will enrich sparsely — acceptance requires ≥10 *richly* onboarded entities, so these are acceptable as long as enough others succeed; optionally replace them.

### Minor

- **R9 · Entity IDs** = deterministic slug `{type}:{slug(name)}` (e.g. `startup:enfarm-agritech`) → `link` is idempotent on re-run.
- **R10 · `trace_id`** column added to `events`, `artifacts`, `jobs`, `matches` (claim in §13 made real).
- **R11 · `edges`** gains `dst_name TEXT` + `dst_resolved BOOLEAN`; names resolve to ids when the target onboards (keeps GraphRag joins clean).
- **R12 · `Matcher` port signature**: `async def rank(startup, candidates, ctx) -> list[ScoredMatch]`. `LlmJudgeMatcher` enqueues a pi rank+explain job and parses JSON. Correction: **`match` is an agent-backed stage** (its `jobs.agent` is set, not null) — it is not a pure-code stage.
- **R13 · Migrations**: numbered `001_*.sql`, `002_*.sql`; a small idempotent migration runner in `bootstrap.py` (don't rely solely on `initdb`); volume-wipe documented for reset.
- **R14 · Secrets/env**: add `.env.example` (`DATABASE_URL`, agent model, concurrency caps); supervisor uses host `~/.pi` + `~/.feynman` auth; include a rough token/cost budget for the 25-startup + 20-investor run in the acceptance notes.
- **R15 · Scheduling framing**: do not pitch "end-to-end incl. scheduling." Drafts use a **non-time CTA** ("NIC will coordinate a call"); `verify` enforces no invented times. `send`/`schedule` remain WIP (§12).
