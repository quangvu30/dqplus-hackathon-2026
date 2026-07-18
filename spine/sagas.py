"""Onboarding saga (spec §6 Saga 1): ingest → enrich → extract → link → EntityReady.

  enrich   (feynman)  web research → provenance-rich profile + relationships
  extract  (feynman)  normalize to canonical sectors (R2) + infer looking_for
  link     (code)     merge → upsert entity (status='ready') + write edges

Forward-recovery only, no compensations. The agent→spine contract is R3: the
terminal message is a single fenced ```json block validated against schemas/*.json.
"""
from __future__ import annotations

import json
from pathlib import Path

import jsonschema

from .ids import slugify
from .store import Store

_SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schemas"
_SCHEMAS = {
    "enrich": json.loads((_SCHEMA_DIR / "enrich.json").read_text()),
    "extract": json.loads((_SCHEMA_DIR / "extract.json").read_text()),
}

ONBOARDING_STAGES = ["enrich", "extract", "link"]
AGENT_STAGES = {"enrich", "extract"}

# stage -> (next_stage, next_agent). link is terminal (EntityReady).
_NEXT = {
    "enrich": ("extract", "extractor"),
    "extract": ("link", None),
}

_ALLOWED_KINDS = ["raised_from", "invested_in", "pilot_with",
                  "founded_by_alumni_of", "partner_with"]

_REMINDER = ("\n\nIMPORTANT: your previous reply was not valid. Respond with ONLY a "
             "single fenced ```json block and nothing else — no prose, no explanation.")


def validate(stage: str, data) -> bool:
    schema = _SCHEMAS.get(stage)
    if schema is None or not isinstance(data, dict):
        return False
    try:
        jsonschema.validate(data, schema)
        return True
    except jsonschema.ValidationError:
        return False


async def build_prompt(stage: str, job, store: Store) -> str:
    target_id = job["target_id"]
    retry = (job["attempts"] or 0) > 1
    if stage == "enrich":
        prompt = await _enrich_prompt(target_id, store)
    elif stage == "extract":
        prompt = await _extract_prompt(job["saga_id"], target_id, store)
    else:
        raise ValueError(f"no prompt for code stage {stage!r}")
    return prompt + (_REMINDER if retry else "")


async def _enrich_prompt(target_id: str, store: Store) -> str:
    ent = await store.get_entity(target_id)
    seed = ent["profile"] if ent else {}
    kinds = ", ".join(_ALLOWED_KINDS)
    return f"""You are enriching an entity for Vietnam's National Innovation Center (NIC) \
deal-flow database.

ENTITY
- type: {ent['type'] if ent else 'startup'}
- name: {ent['name'] if ent else target_id}
- country hint: {seed.get('country')}
- sector hints: {seed.get('sectors')}
- website hint: {seed.get('hint_website')}

Use your web_search and fetch_content tools to gather REAL public data from multiple \
sources (official site, Crunchbase/Dealroom, press, LinkedIn, startup.gov.vn / VnExpress \
for Vietnamese entities).

HARD RULES
- Every populated field MUST carry a real `source_url` you actually visited.
- A field you cannot find: set value null, "confidence":"unavailable", "source_url":null. \
Never invent data.
- For individuals never collect PII (DOB, ID/passport, tax id, personal phone/address).
- Surface relationships in a top-level "relationships" array. Each item: \
{{"kind": one of [{kinds}], "dst_name":"<org or person name>", "source_url":"<url>"}} \
where THIS entity is the subject (e.g. a startup "raised_from" a fund, or is \
"founded_by_alumni_of" a university).

OUTPUT (R3 contract)
Reply with ONLY a single fenced ```json block. Top-level keys: "entity_type", the \
provenance-tracked profile sections (each field as \
{{"value":..., "source_url":..., "confidence":...}}), "relationships", and \
"collection_summary". No prose before or after the JSON block."""


async def _extract_prompt(saga_id: str, target_id: str, store: Store) -> str:
    enrichment = await store.get_artifact(saga_id, "enrich", target_id) or {}
    ent = await store.get_entity(target_id)
    blob = json.dumps(enrichment, ensure_ascii=False)[:8000]
    return f"""You are normalizing an enriched profile into structured matching fields \
for a deal-flow matcher. Entity type: {ent['type'] if ent else 'startup'}.

ENRICHED DATA (JSON):
{blob}

Produce ONLY a single fenced ```json block with exactly these keys:
- "sectors": array of CANONICAL English sector tags. Normalize aggressively:
    enterprise_ai / ai_agents / automation → "ai"; clean_energy → "cleantech";
    "nông nghiệp" / agritech / foodtech-agri → "agritech"; healthcare / biotech / \
healthtech → "healthtech"; supply_chain / logistics → "supply_chain";
    keep fintech, robotics, semiconductor, iot, deep_tech as-is. Lowercase, underscored.
- "looking_for": array from ["funding","corporate_pilot","rd_collaboration","talent",\
"market_access","strategic_partnership"]. If unknown for a startup, use ["funding"].
- "stage": funding stage string (e.g. "seed","series_a") or null.
- "description_en": 1-2 sentence English summary, or null.
- "description_vi": 1-2 sentence Vietnamese summary, or null.

Derive ONLY from the enriched data above — do not invent facts. No prose outside the JSON."""


async def persist_and_advance(store: Store, job, data: dict) -> None:
    """enrich/extract: record the artifact, then transactionally advance the DAG."""
    stage = job["stage"]
    saga_id = job["saga_id"]
    target_id = job["target_id"]
    trace_id = job["trace_id"]

    await store.record_artifact(saga_id, stage, data, entity_id=target_id,
                                target_id=target_id, trace_id=trace_id)
    next_stage, next_agent = _NEXT[stage]
    event_kind = "Enriched" if stage == "enrich" else "Extracted"
    await store.finish_stage(
        job_id=job["id"], saga_id=saga_id, event_kind=event_kind,
        saga_step=next_stage, saga_status="running",
        event_payload={"target_id": target_id}, trace_id=trace_id,
        next_stage=next_stage, next_target_id=target_id, next_agent=next_agent,
        next_input_ref={"from": stage},
    )


# collection_summary verdicts that mean "we could not confirm this entity exists".
_DEAD_VERDICTS = {"not_found", "not found", "no_data", "unverifiable", "failed"}


def _count_populated(node) -> int:
    """Recursively count provenance fields ({value,...}) with a non-null value.
    Handles the enricher's varied nesting (top-level, profile.profile, contact, …)."""
    if isinstance(node, dict):
        if "value" in node and "confidence" in node:
            v = node.get("value")
            return 0 if v is None or v == [] or v == "" else 1
        return sum(_count_populated(v) for v in node.values())
    if isinstance(node, list):
        return sum(_count_populated(v) for v in node)
    return 0


def _enrichment_failed(enrichment: dict) -> bool:
    """True when enrichment yielded no real data — a dead/nonexistent seed.
    Gates such entities out of matching (which only pulls status='ready')."""
    summary = enrichment.get("collection_summary") or {}
    verdict = str(summary.get("status") or summary.get("verdict") or "").strip().lower()
    if verdict in _DEAD_VERDICTS:
        return True
    # No provenance field anywhere carries a value, and no relationships surfaced.
    data_only = {k: v for k, v in enrichment.items()
                 if k not in ("collection_summary", "seed", "normalized", "entity_type")}
    return _count_populated(data_only) == 0 and not (enrichment.get("relationships") or [])


async def link(store: Store, job) -> None:
    """Code stage: merge enrich + extract artifacts → upsert the entity profile
    and write relationships to the edges graph. Entities whose enrichment found no
    verifiable data are marked status='unverified' so matching skips them (R9)."""
    saga_id = job["saga_id"]
    target_id = job["target_id"]
    trace_id = job["trace_id"]

    ent = await store.get_entity(target_id)
    enrichment = await store.get_artifact(saga_id, "enrich", target_id) or {}
    extraction = await store.get_artifact(saga_id, "extract", target_id) or {}

    profile = dict(enrichment)
    profile["seed"] = ent["profile"] if ent else {}
    profile["normalized"] = extraction  # sectors/looking_for/stage/description_* (R2)

    status = "unverified" if _enrichment_failed(enrichment) else "ready"
    await store.upsert_entity(
        target_id, ent["type"], ent["name"], profile=profile, status=status
    )

    for rel in enrichment.get("relationships") or []:
        dst_name = rel.get("dst_name")
        kind = rel.get("kind")
        if not dst_name or not kind:
            continue
        # R11: unresolved id from the raw name; resolves when that entity onboards.
        await store.upsert_edge(
            target_id, f"name:{slugify(dst_name)}", kind,
            dst_name=dst_name, dst_resolved=False,
            source_url=rel.get("source_url"), payload=rel,
        )

    await store.finish_stage(
        job_id=job["id"], saga_id=saga_id, event_kind="EntityReady",
        saga_step="link", saga_status="done",
        event_payload={"entity_id": target_id}, trace_id=trace_id,
    )
