# Generalizing the Deal-flow Spine into a Config-Driven AI Agent Data Platform — Design Spec

- **Date:** 2026-07-18
- **Status:** Design approved (Sections A–G), pending spec review → implementation plan
- **Supersedes for platform concerns:** none — extends `2026-07-18-agent-data-platform-design.md` (the matchmaker design of record). The matchmaker becomes **app #1** on the platform this spec defines.

---

## 0. Summary

The existing `spine/` (supervisor + Postgres + event-sourced sagas + isolated `feynman`/`pi`
agent runtime pools over stdio JSON-RPC) is already ~80% a domain-agnostic platform. This
spec **draws the line**: extract every deal-flow assumption out of the spine and re-express it
as **data an app declares** (a manifest + a plugin module), so one running platform instance can
host arbitrary apps.

Four decisions are locked (each chosen deliberately over stated alternatives):

| # | Decision | Choice | Rejected alternative |
|---|---|---|---|
| G1 | Plug-in model | **Config-driven platform** — apps are manifests + plugin modules | framework/library; hybrid |
| G2 | Data model | **Core + app tables** — platform owns orchestration/blackboard; apps own domain schema | universal graph+schemas; schema-per-app |
| G3 | Tenancy | **Multi-app, shared pools** — one supervisor, `app_id` everywhere, pools keyed by `(runtime, skill, model)` | isolated pools; single-app-per-instance |
| G4 | Structure | **Pragmatic hexagonal** — I/O-free core + ports for real seams; `Store` port honestly Postgres-shaped | strict hexagonal; keep flat |

**Definition of done:** the existing matchmaker's A1–A5 North Star still passes, unchanged, but
driven **entirely through a manifest** — with **zero deal-flow strings left in the platform core**.

---

## A. Platform boundary (core vs app)

The generalization is a line drawn through the current code. Everything reusable stays in the
core; everything deal-flow-specific moves behind the line into an app package.

| | **Platform core** (`spindle/`, domain-agnostic) | **App** (`apps/matchmaker/`) |
|---|---|---|
| Owns | supervisor, scheduler, DAG engine, pool manager, transport, lease/reclaim/dead-letter, event log, control plane, plugin/port registry, manifest loader | entity/edge/match tables, code-stage bodies, `Matcher` impls, domain skills, seed data |
| Knows about | jobs, events, sagas, workers, artifacts, `app_id`, `AgentSpec`, runtimes | startups, investors, provenance shape, VI/EN drafts, sectors |
| Ships | a Python package + platform migrations + a manifest JSON Schema | `app.yaml` + a plugin module + app migrations |

**Working names:** `spindle` (the platform core) and `apps/matchmaker` (app #1). Rename negotiable.

The work is **extraction**, not rewrite: the deal-flow assumptions currently hardcoded in
`sagas.py`, `supervisor.py`, and `store.py` (stage names, the two sagas, entity types, Matcher
wiring) become data the platform loads from a manifest.

---

## B. Data model

Platform-owned tables get an `app_id` column; app tables are whatever the app's migrations declare.
The platform **never references app tables**.

```sql
-- PLATFORM tables (spindle migrations) — every row scoped by app_id
apps            (app_id PK, name, manifest_sha, registered_at)               -- app registry
jobs            (id, app_id, saga_id, stage, agent, input_ref, status,
                 attempts, leased_by, lease_expires_at,
                 UNIQUE(app_id, saga_id, stage))                             -- idempotency key
events          (id, app_id, saga_id, seq, kind, payload,
                 UNIQUE(app_id, saga_id, seq))                               -- append-only source of truth
saga_instances  (saga_id PK, app_id, type, subject_id, current_step, status) -- folded projection
artifacts       (id, app_id, saga_id, step, entity_id, payload)             -- generic blackboard / audit trail
workers         (worker_id PK, runtime, skill, model, pid, boot_epoch,
                 status, current_job_id, jobs_since_reset, restart_count,
                 last_heartbeat_at)                                          -- pools SHARED, not app-scoped

-- APP tables (apps/matchmaker migrations) — platform is oblivious to these
entities, edges, matches   -- exactly today's schema, minus the "platform" role
```

Two load-bearing consequences:

- **`workers` is not app-scoped** (shared pools); **`jobs` is**. The scheduler leases an
  `app_id`-tagged job onto any free worker whose `(runtime, skill, model)` matches the job's
  `AgentSpec`.
- **`artifacts` stays generic** so the blackboard/audit trail is uniform across apps. App-specific
  *results* (like `matches`) live in app tables that a **code stage** writes — the platform sees only
  the artifact and event, never the app row.

App code stages run **in-process** in the supervisor (same trust domain as today — apps are
first-party). The `RuntimeLauncher` seam keeps *agent* runtimes out-of-process/isolated; code
stages are trusted plugin functions.

---

## C. App manifest & plugin system (the config-driven contract)

An app's surface is a **manifest** (shape; validated by a platform JSON Schema) plus a **plugin
module** (code-stage bodies + swappable ports).

```yaml
# apps/matchmaker/app.yaml
app_id: matchmaker
plugin: apps.matchmaker.plugin          # dotted path the platform imports at boot

agents:                                 # → AgentSpec; pool key = (runtime, skill, model)
  enricher:  { runtime: feynman, skill: entity-enrichment, tools: [web_search, fetch_content, write, read], pool_size: 2 }
  drafter:   { runtime: pi,      skill: dealflow-match,     pool_size: 2 }
  verifier:  { runtime: pi,      skill: draft-verify,       pool_size: 1 }

ports:                                  # named, swappable — the Matcher generalizes to this
  matcher: matchmaker.LlmJudgeMatcher   # one-line swap → EmbeddingMatcher / GraphRagMatcher later

sagas:
  onboarding:                           # subject: entity
    - { stage: ingest,  run: code }     # run: code → resolved from the plugin registry
    - { stage: enrich,  run: enricher }
    - { stage: extract, run: enricher }
    - { stage: link,    run: code }
  outreach:                             # subject: startup
    - { stage: filter,  run: code }
    - { stage: match,   run: code, port: matcher }          # code stage calls the named port
    - { stage: draft,   run: drafter }
    - { stage: verify,  run: verifier, on_reject: { retry: draft, max: 2, then: dead } }
```

The **plugin module** registers code stages and ports by name:

```python
# apps/matchmaker/plugin.py
@stage("ingest")
def ingest(ctx: StageCtx): ...           # ctx = {app_id, saga_id, subject_id, store, artifact_in}
@stage("link")
def link(ctx): ...                        # writes entities + edges (app tables)
@stage("filter")
def filter_partners(ctx): ...
@stage("match")
def match(ctx): ...                       # calls ctx.port("matcher")

@port("matcher")
class LlmJudgeMatcher(Matcher): ...
```

**Boot sequence:** load each `app.yaml` → validate against the manifest schema → import the
plugin module → build saga DAGs and `AgentSpec`s as **in-memory data**. No deal-flow strings
land in `spindle/`. The `Matcher` port stops being special: it is simply the first **named port**,
and the generic plugin/port registry is the real generalization of the old D10.

**Manifest semantics fixed here:**
- Saga = an ordered list of stages. `run: code | <agent-name>`.
- `port:` on a stage exposes a named, app-swappable component to that stage's `ctx`.
- `on_reject` is a declarative retry edge in the DAG: `{ retry: <stage>, max: N, then: dead }`.

---

## D. Supervisor changes for multi-app shared pools

Four surgical changes generalize the supervisor. The lease/reclaim/event-transaction core does
**not** move.

1. **Scheduler is stage-name-agnostic.** `SELECT … FOR UPDATE SKIP LOCKED` returns an
   `app_id`-tagged job; the supervisor resolves `stage → {run, port?}` from that app's loaded
   manifest. Code stages dispatch to the plugin registry in-process; agent stages lease onto a
   matching pool worker.
2. **Pool manager keys pools by `(runtime, skill, model)`, not by app.** At boot it takes the
   **union** of all apps' `AgentSpec`s, dedups by pool key, and spawns `max(pool_size)` per key.
   A `feynman/entity-enrichment` pool serves every app that declares the same agent. Tool
   allowlists must be compatible per pool key — **validated at load; mismatch = manifest error.**
3. **DAG engine reads the saga list from the manifest.** When stage *k*'s event lands, enqueue
   stage *k+1* from that app's saga definition (replacing the hardcoded `next_stage` map).
   `on_reject` is a generic retry edge.
4. **Everything gains an `app_id` filter.** Reconcile-on-boot, `LISTEN/NOTIFY` wake-ups, lease
   reclaim, dead-letter — already keyed by `saga_id`; they now carry `app_id` alongside. Crash-
   recovery logic is otherwise unchanged.

The invariants encoded by this repo's `saga-resilience`, `schema-audit`, and
`observability-audit` skills (R5/R6 leases, idempotency, telemetry, provenance) **carry over
unchanged** — only their scope widens from `saga_id` to `(app_id, saga_id)`.

---

## E. Pragmatic hexagonal structure (G4)

The domain core imports **zero I/O**; everything it touches is a **port**; adapters plug in at the
edge. Ports exist for **testability and real second-adapters** — not for imaginary DB portability.

```
spindle/
  core/         # saga engine, DAG advance, reconciler — pure, no I/O imports, unit-testable
  ports.py      # Protocols: Store, RuntimeLauncher, Notifier, Clock
  adapters/     # PostgresStore, LocalProcessLauncher, ContainerLauncher, PgNotifier, SystemClock
  app/          # supervisor wiring, manifest loader, plugin/port registry (the composition root)
```

**Ports and why each earns its place (≥2 real adapters, or a genuine isolation/test seam):**

| Port | Adapters (real) | Why it's a port |
|---|---|---|
| `RuntimeLauncher` | `LocalProcessLauncher` (host now), `ContainerLauncher` (later) | two real adapters — the host→container seam |
| App `ports:` (e.g. `Matcher`) | `LlmJudgeMatcher`, `EmbeddingMatcher`, `GraphRagMatcher` | multiple real impls; the manifest's `ports:` section *is* this registry |
| `Store` | `PostgresStore` (only one, deliberately) | testability seam — the core runs against a fake store in unit tests |
| `Notifier` / `Clock` | `PgNotifier` (`LISTEN/NOTIFY`), `SystemClock` | isolate the two non-deterministic edges so the core is testable |
| *(WIP)* `Sender` / `Scheduler` | `dry_run` / real Gmail & Calendar, with compensations | two adapters each; deferred seam |

**The `Store` port is honestly Postgres-shaped.** It exposes `lease_ready_job()`,
`append_event_and_advance()`, `reclaim_expired()` — *not* a generic `find_all()`/`save()`
repository. Rationale: `SKIP LOCKED` leasing, `LISTEN/NOTIFY`, and the single-transaction
event+job+saga write are Postgres-specific and load-bearing — they are the entire crash-recovery
story. A pretend-portable repository would add mapping ceremony for a second adapter that will
never arrive and would tempt a future refactor to "simplify away" the exact SQL that makes
recovery correct. One adapter is fine; the port earns its keep purely as a test seam.

`core/` is the only package with an enforced import rule: it may import `ports.py` and stdlib,
**never** `adapters/` or `asyncpg`. That rule is the whole point — verify it with a cheap import-
lint in CI.

---

## F. Matchmaker as app #1 (dogfood + regression proof)

The generalization is "done" only when the existing matchmaker runs on the platform with **zero
deal-flow strings in `spindle/`**. Mapping:

| Today | Moves to |
|---|---|
| `spine/sagas.py` (two sagas) | `apps/matchmaker/app.yaml` |
| deterministic bodies of `ingest`/`link`/`filter`/`match` | `apps/matchmaker/plugin.py` (`@stage`) |
| `spine/matcher/` | `apps/matchmaker/` behind `@port("matcher")` |
| `entities`/`edges`/`matches` migrations | `apps/matchmaker/migrations/` |
| domain skills in `.feynman/agent/skills/` | stay put; referenced by name from the manifest |
| API / dashboard | unchanged — they read app tables (app-layer, not platform) |

**Acceptance = the existing A1–A5 North Star still passes**, unchanged, driven through the manifest.
That is the regression gate: same demo, generalized guts.

---

## G. Reuse / change / new, build order, risks

| Reuse as-is | Change (generalize) | New |
|---|---|---|
| `transport.py`, `pools.py`, `telemetry.py`, `ids.py`, control-plane recovery, event-transaction pattern | `supervisor.py` (4 changes in §D), `sagas.py` → manifest loader, `store.py` (+`app_id`, port-shape) | manifest JSON Schema + loader, plugin/port registry, `apps/` layout, `apps` table, `core/adapters` split + import-lint |

**Build order** (fully sequenced in the writing-plans step):

1. Platform migrations: add `app_id`, `apps` table; keep `artifacts` generic.
2. Manifest schema + loader + plugin/port registry — pure, unit-testable, no DB.
3. Extract `core/` (saga engine, DAG, reconciler) behind `ports.py`; move Postgres into
   `adapters/PostgresStore`; add the `core/` import-lint.
4. Generalize scheduler / DAG / pool-manager to read the loaded manifest (§D).
5. Extract matchmaker into `apps/matchmaker/` (manifest + plugin + migrations).
6. Regression: A1–A5 pass through the manifest path.

**Top risks:**

- **R-a — shared-pool tool/model incompatibility across apps.** Mitigate: load-time validation of
  per-pool-key `(tools, model)` compatibility; mismatch is a hard manifest error.
- **R-b — extraction blast radius.** `supervisor.py`/`store.py` are the highest-risk edits. Mitigate:
  do the extraction **behind a passing A1–A5 regression test** so any regression surfaces immediately;
  ports let the core be tested against a fake store before the real wiring changes.
- **R-c — scope creep** into multi-app features nobody needs yet (per-app quotas, RBAC, per-app
  cost ceilings, an app-management UI). Explicitly deferred to a WIP seam; not in this spec.

---

## H. Explicitly deferred (WIP seams, not in scope)

- Side-effect adapters (`Sender`/`Scheduler`) + compensation registry — inherited from the
  matchmaker design of record; still deferred.
- `ContainerLauncher` — the seam exists (`RuntimeLauncher`); the container adapter is later.
- Per-app quotas / RBAC / cost ceilings / app-management UI (R-c).
- `EmbeddingMatcher` / `GraphRagMatcher` — pluggable via the app `ports:` mechanism; not built here.
