# AI Agent Skill Verification Report

**Project:** Deal-flow Matchmaker (agent data platform, VAIC 2026 · NIC)  
**Date:** 2026-07-18  
**Status:** Verified against source code at `/home/delus/Documents/code/hackathon/deal-flow-matchmaker`

---

## Purpose

Verify 7 concept/theory-focused AI agent skills from the `skills.sh` registry against the
actual project codebase, assessing relevance and effort required for adaptation. All skills
were downloaded via `npx skills add` and read from their cloned repositories.

---

## Project Context

| Attribute | Value |
|---|---|
| Stack | Python 3.12, asyncpg, structlog, jsonschema, FastAPI, Postgres 16 |
| Architecture | Deterministic Python spine + isolated agent runtimes (feynman, pi) |
| Data model | `entities`, `edges`, `artifacts`, `matches` — relational, provenance-tracked |
| Agent runtimes | `feynman` (crawler, web tools) for enrich/extract; `pi` (reasoning) for match/draft/verify |
| Sagas | Onboarding (enrich → extract → link), Outreach (filter → match → draft → verify) |
| Existing skills | Custom skills at `.feynman/agent/skills/` |

---

## Per-Skill Verification

### 1. data-schema-knowledge-modeling

**Source:** `npx skills add lyndonkl/claude@data-schema-knowledge-modeling`  
**Registry:** https://skills.sh/lyndonkl/claude/data-schema-knowledge-modeling  
**GitHub:** https://github.com/lyndonkl/claude  
**Installs:** 130

| Dimension | Assessment |
|---|---|
| Conceptual fit | ✅ High — entity modeling, relationships, cardinality, constraints, lifecycle patterns, multi-tenancy, soft deletes, hierarchies |
| Directly usable? | ❌ No — designed as greenfield schema builder; your schema already exists |
| What to keep | 5-step validation workflow (repurpose as audit), soft-delete pattern, temporal data, hierarchy modeling patterns, naming conventions, schema type decision framework (relational vs document vs graph vs dimensional) |
| What to strip | "Start from scratch" workflow, implement-from-zero prompts |
| Effort to adapt | **Moderate** — reframe as audit tool. The rubric (`rubric_data_schema_knowledge_modeling.json`) and methodology reference are high-value for validating existing schema and planning GraphRagMatcher phase |
| Key takeaway | Best used to audit the current `entities`/`edges`/`artifacts`/`matches` schema against modeling best practices |

---

### 2. ai-data-engineering

**Source:** `npx skills add ancoleman/ai-design-components@ai-data-engineering`  
**Registry:** https://skills.sh/ancoleman/ai-design-components/ai-data-engineering  
**GitHub:** https://github.com/ancoleman/ai-design-components  
**Installs:** not listed (part of 76-skill monorepo)

| Dimension | Assessment |
|---|---|
| Conceptual fit | ⚠️ Partial — RAG pipelines, embeddings, chunking strategies, evaluation metrics (RAGAS), orchestration patterns |
| Directly usable? | ❌ No — built entirely around LangChain/Qdrant/Dagster/Feast/LakeFS/MLflow stack |
| Overlap with project | Schema mentions planned `EmbeddingMatcher` and `GraphRagMatcher`. RAG architecture concepts apply to future phases. Orchestration patterns parallel your supervisor |
| What to keep | RAG pipeline 5-stage model, chunking decision framework (size/overlap/strategy), RAGAS evaluation metrics, embedding model comparison, chunking strategies for code-aware/semantic |
| What to strip | All LangChain/Qdrant/Dagster/Feast/LakeFS/MLflow code. Frontend integration. pip install instructions |
| Effort to adapt | **Heavy** — extract ~20% (concepts), discard ~80% (tools). File as future-phase reference |
| Key takeaway | Reference for adding semantic search / embedding-based match scoring in a later phase |

---

### 3. architecting-data

**Source:** `npx skills add ancoleman/ai-design-components@architecting-data`  
**Registry:** https://skills.sh/ancoleman/ai-design-components/architecting-data  
**GitHub:** https://github.com/ancoleman/ai-design-components  
**Installs:** 60

| Dimension | Assessment |
|---|---|
| Conceptual fit | ✅ High — storage paradigms, data modeling approaches, data mesh principles, medallion architecture, open table formats, governance, decision frameworks |
| Directly usable? | ❌ No — assumes Snowflake/Databricks/dbt/Fivetran ecosystem |
| Overlap with project | Decision frameworks help document architectural choices (why simple relational model for v1). Medallion architecture parallels quality layers |
| What to keep | All four decision frameworks (storage paradigm, modeling approach, mesh readiness, table format selection). Medallion pattern. Data modeling approaches (dimensional, normalized, data vault, wide tables). Governance patterns. Anti-patterns list. Best practices |
| What to strip | Vendor-specific tool recommendations (Snowflake, Databricks, dbt, Fivetran). Modern data stack section. dbt/SQL implementation examples. Tool selection by org size |
| Effort to adapt | **Moderate** — keep concepts + frameworks, strip tool recommendations. Add a "Why Postgres is sufficient for v1" section |
| Key takeaway | Use for architectural decision records (ADRs) documenting why you chose your current architecture |

---

### 4. designing-distributed-systems

**Source:** `npx skills add ancoleman/ai-design-components@designing-distributed-systems`  
**Registry:** https://skills.sh/ancoleman/ai-design-components/designing-distributed-systems  
**GitHub:** https://github.com/ancoleman/ai-design-components  
**Installs:** 77

| Dimension | Assessment |
|---|---|
| Conceptual fit | ⚠️ Partial — saga pattern and resilience sections are highly relevant; rest is overkill |
| Directly usable? | ❌ No — covers multi-node distributed systems; you're single-process + Postgres |
| Overlap with project | README explicitly mentions "event-sourced sagas". Resilience patterns map to supervisor crash recovery (leases, reclaim, dead-letter). Idempotency section maps to `UNIQUE` constraints on `artifacts` and `jobs` |
| What to keep | Saga pattern section (choreography vs orchestration — complete). Resilience patterns (circuit breaker, bulkhead, timeout, retry with jitter). Idempotency patterns. Event sourcing concepts. CAP/PACELC decision frameworks |
| What to strip | Multi-leader replication, leaderless quorums, service discovery, caching strategies, CQRS, service mesh, geographic partitioning, consensus algorithms. ~80% of content |
| Effort to adapt | **Heavy** — extract saga + resilience ~20%. Valuable as reference for supervisor hardening |
| Key takeaway | The saga orchestration pattern directly maps to your `spine/sagas.py` and `spine/outreach.py` |

---

### 5. implementing-observability

**Source:** `npx skills add ancoleman/ai-design-components@implementing-observability`  
**Registry:** https://skills.sh/ancoleman/ai-design-components/implementing-observability  
**GitHub:** https://github.com/ancoleman/ai-design-components  
**Installs:** not listed (76-skill monorepo)

| Dimension | Assessment |
|---|---|
| Conceptual fit | ✅ High — three pillars (metrics, logs, traces), structured logging, log-trace correlation, OpenTelemetry concepts |
| Directly usable? | ⚠️ Partially — concepts are correct, assumes LGTM stack + OTel SDK |
| Overlap with project | You already use `structlog`. Schema has `trace_id` on artifacts and matches. Log-trace correlation is exactly what you need |
| What to keep | Three pillars concept. Log-trace correlation pattern (critical — inject trace_id/span_id into every log). Structured logging best practices. Metric types (counter, gauge, histogram). Auto-instrumentation concepts. Success metrics (MTTR, alert noise) |
| What to strip | LGTM stack deployment (Docker/K8s). OTel SDK installation. Language-specific code for Rust/Go/TypeScript (keep Python). Grafana/Tempo/Loki specifics |
| Effort to adapt | **Light-Moderate** — most immediately useful skill. Adapt `structlog` examples (you already use it). Replace LGTM with whatever monitoring stack you adopt. The log-trace correlation pattern is the single highest-value piece across all 7 skills |
| Key takeaway | Immediately actionable: add `trace_id` injection to all `structlog` calls. Current span context → log record automatically |

---

### 6. platform-engineering

**Source:** `npx skills add ancoleman/ai-design-components@platform-engineering`  
**Registry:** https://skills.sh/ancoleman/ai-design-components/platform-engineering  
**GitHub:** https://github.com/ancoleman/ai-design-components  
**Installs:** not listed (76-skill monorepo)

| Dimension | Assessment |
|---|---|
| Conceptual fit | ⚠️ Weak — designed for engineering org IDPs (Internal Developer Platforms), not data platforms |
| Directly usable? | ❌ No — assumes Kubernetes, Backstage, Port, Argo CD, Crossplane, developer portals |
| Overlap with project | Platform maturity model and metrics concepts could be reframed for a data platform. Platform-as-product philosophy applies |
| What to keep | Maturity assessment framework (repurpose for data platform maturity). Platform-as-product philosophy. Metrics concepts (adapt DORA/SPACE → data platform metrics: data freshness, match quality, pipeline throughput). Build vs buy decision framework |
| What to strip | Everything about Backstage, Port, Crossplane, Argo CD, Golden Paths, developer onboarding, IDP architecture. ~90% of content |
| Effort to adapt | **Very Heavy** — needs complete reframing from "developer platform" to "data platform". Long-term value only if project grows into multi-tenant SaaS |
| Key takeaway | Skip for now. Revisit if the platform scales to serve external tenants |

---

### 7. creating-dashboards

**Source:** `npx skills add ancoleman/ai-design-components@creating-dashboards`  
**Registry:** https://skills.sh/ancoleman/ai-design-components/creating-dashboards  
**GitHub:** https://github.com/ancoleman/ai-design-components  
**Installs:** not listed (76-skill monorepo)

| Dimension | Assessment |
|---|---|
| Conceptual fit | ⚠️ Partial — dashboard UX patterns are solid, but implementation assumptions don't match |
| Directly usable? | ❌ No — assumes React + Tremor + react-grid-layout + TypeScript |
| Overlap with project | You have `dashboard/index.html` (FastAPI + vanilla JS) and `docs/DESIGN_SYSTEM.md`. KPI card anatomy, filter coordination, real-time update strategies are applicable |
| What to keep | KPI card design patterns. Layout strategies. Real-time updates (SSE/WebSocket/polling — you already poll every 3s). Filter coordination concepts. Performance optimization (lazy loading, caching). Dashboard creation workflow |
| What to strip | All React code (Tremor, react-grid-layout). All TypeScript examples. Library selection guide. npm install instructions |
| Effort to adapt | **Heavy** — keep UX concepts only, discard all implementation code. Adapt to your existing vanilla JS + FastAPI dashboard |
| Key takeaway | Use the UX patterns (KPI card anatomy, filter coordination, real-time strategies) as reference when improving `dashboard/index.html` |

---

## Summary Matrix

| # | Skill | Relevance | Directly Usable? | Adaptation Effort |
|---|---|---|---|---|
| 1 | `lyndonkl/claude@data-schema-knowledge-modeling` | ✅ High | ❌ No | Moderate |
| 2 | `ancoleman/ai-design-components@ai-data-engineering` | ⚠️ Partial (future) | ❌ No | Heavy |
| 3 | `ancoleman/ai-design-components@architecting-data` | ✅ High | ❌ No | Moderate |
| 4 | `ancoleman/ai-design-components@designing-distributed-systems` | ⚠️ Partial (saga) | ❌ No | Heavy |
| 5 | `ancoleman/ai-design-components@implementing-observability` | ✅ High | ⚠️ Partially | Light-Moderate |
| 6 | `ancoleman/ai-design-components@platform-engineering` | ⚠️ Low | ❌ No | Very Heavy |
| 7 | `ancoleman/ai-design-components@creating-dashboards` | ⚠️ Partial (UX) | ❌ No | Heavy |

---

## Recommended Priority Order

1. **implementing-observability** — immediate value: add structured trace_id to all logs. Lowest effort to adapt. Already use structlog.
2. **architecting-data** — document current architectural decisions using its decision frameworks. Moderate effort, creates durable documentation.
3. **data-schema-knowledge-modeling** — audit existing schema. Moderate effort, catches issues before they compound.
4. **designing-distributed-systems** — extract saga + resilience sections for supervisor hardening. Reference material for crash recovery testing.
5. **ai-data-engineering** — file for future EmbeddingMatcher/GraphRagMatcher phase. No immediate action needed.
6. **creating-dashboards** — reference for dashboard UX improvements. Only if dashboard gets a rewrite.
7. **platform-engineering** — skip entirely. Revisit only if project becomes multi-tenant SaaS.

---

## Adaptation Outcome (2026-07-18)

The top-4 priority skills were adapted into **project-fitted Claude Code skills** under
`.claude/skills/` (distinct from the 4 agent-runtime skills in `.feynman/agent/skills/`).
Each keeps the source's concepts, strips the wrong tooling, and is grounded in — and
line-referenced against — the real codebase (`spine/`, `migrations/`, `schemas/`). All cited
symbols and line numbers were verified against source.

| Source skill | → Adapted skill | Location | Frame |
|---|---|---|---|
| implementing-observability | `observability-audit` | `.claude/skills/observability-audit/SKILL.md` | Audit + extend the **existing** structlog/contextvars setup; add `span_id` + metrics-as-log-events. No OTel/Prometheus/Grafana. |
| architecting-data | `data-architecture-adr` | `.claude/skills/data-architecture-adr/` (+`references/decision-frameworks.md`) | ADR authoring over the real schema; 4 vendor-stripped decision frameworks; worked "ADR-001: Postgres for v1". |
| data-schema-knowledge-modeling | `schema-audit` | `.claude/skills/schema-audit/` (+`references/rubric.json`) | 5-step workflow repurposed as an audit of `entities/edges/artifacts/matches/jobs/events`; per-pattern OK/watch/fix verdicts. |
| designing-distributed-systems | `saga-resilience` | `.claude/skills/saga-resilience/SKILL.md` | Distributed-pattern → real `spine/` mechanism mapping table; crash-recovery test checklist; `LEASE_SECONDS > AGENT_TIMEOUT` invariant. |

**Key correction surfaced during adaptation:** the report's #1 recommendation ("add
`trace_id` to logs") was **already implemented** — `spine/telemetry.py` binds
`trace_id`/`saga_id`/`job_id`/`worker_id` via structlog contextvars, and `trace_id` columns
already exist on artifacts/matches/jobs/events/saga_instances. The observability skill was
therefore reframed as *audit-and-extend* (the open gaps are `span_id` and metrics), not
"add logging".

**Not adapted (per priority order):** `ai-data-engineering` (deferred to the
EmbeddingMatcher/GraphRagMatcher phase), `creating-dashboards` (only on a dashboard
rewrite), `platform-engineering` (skipped).

---

## Installation Commands (Reproducible)

All skills were installed via:

```bash
npx skills add lyndonkl/claude@data-schema-knowledge-modeling
npx skills add ancoleman/ai-design-components@ai-data-engineering
npx skills add ancoleman/ai-design-components@architecting-data
npx skills add ancoleman/ai-design-components@designing-distributed-systems
npx skills add ancoleman/ai-design-components@implementing-observability
npx skills add ancoleman/ai-design-components@platform-engineering
npx skills add ancoleman/ai-design-components@creating-dashboards
```

Cloned source paths:
- `/tmp/pi-github-repos/lyndonkl/claude@main/skills/data-schema-knowledge-modeling/SKILL.md`
- `/tmp/pi-github-repos/ancoleman/ai-design-components@main/skills/{ai-data-engineering,architecting-data,designing-distributed-systems,implementing-observability,platform-engineering,creating-dashboards}/SKILL.md`

---

## Key Finding

All seven skills share the same pattern: **solid conceptual frameworks, heavy tool-specific implementation code** that doesn't match the project stack (Python/FastAPI/Postgres vs React/TypeScript/Kubernetes). None can be used as-is. The value extraction strategy is consistent across all: keep the concepts, discard the tools.

---

## Sources

- Project source: `/home/delus/Documents/code/hackathon/deal-flow-matchmaker/`
- Skills registry: https://skills.sh
- lyndonkl/claude: https://github.com/lyndonkl/claude (170 skills)
- ancoleman/ai-design-components: https://github.com/ancoleman/ai-design-components (76 skills)
