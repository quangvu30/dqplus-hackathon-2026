"""Outreach saga (spec §6 Saga 2): rule-filter -> match+explain -> draft -> verify.

  filter   (code)         permissive rule-filter (R2) -> candidate handful
  match    (pi, agent)    LlmJudgeMatcher ranks + explains -> matches rows (status='ranked')
  draft    (pi, per match) dealflow-match §4 -> bilingual draft, non-time CTA (R15)
  verify   (pi, per match) draft-verify LLM-judge -> pass gates status='draft_ready';
                           fail re-arms the draft sub-job with verify_feedback (R5)

Forward-recovery only. The agent->spine contract is R3 (terminal fenced ```json block
validated against schemas/{rank,draft,verify}.json). draft/verify fan out per candidate
(target_id = partner_id) with UNIQUE(saga_id, stage, target_id) as the per-match key (R5).
"""
from __future__ import annotations

import json
from pathlib import Path

import jsonschema

from . import config
from .matcher import rule_filter
from .store import Store

OUTREACH_STAGES = ["filter", "match", "draft", "verify"]
OUTREACH_AGENT_STAGES = {"match", "draft", "verify"}

_SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schemas"
_SCHEMAS = {
    "rank": json.loads((_SCHEMA_DIR / "rank.json").read_text()),
    "draft": json.loads((_SCHEMA_DIR / "draft.json").read_text()),
    "verify": json.loads((_SCHEMA_DIR / "verify.json").read_text()),
}


def saga_id_for(startup_id: str) -> str:
    return f"outreach:{startup_id}"


def validate(stage: str, data) -> bool:
    schema = _SCHEMAS.get(stage)
    if schema is None or not isinstance(data, dict):
        return False
    try:
        jsonschema.validate(data, schema)
        return True
    except jsonschema.ValidationError:
        return False


async def start(store: Store, startup_id: str, *, trace_id: str) -> str:
    """Create the outreach saga for a ready startup and enqueue its filter job."""
    saga_id = saga_id_for(startup_id)
    await store.create_saga(saga_id, "outreach", startup_id,
                            current_step="filter", trace_id=trace_id)
    await store.enqueue_job(saga_id, "filter", target_id=startup_id, trace_id=trace_id)
    return saga_id


async def filter_stage(store: Store, job) -> None:
    """Code stage: permissive rule-filter (R2) over ready partners -> candidate handful.
    Advances to the agent-backed `match` stage (R12)."""
    saga_id = job["saga_id"]
    startup_id = job["target_id"]
    trace_id = job["trace_id"]

    startup = await store.get_entity(startup_id)
    norm = (startup["profile"].get("normalized") or {}) if startup else {}
    startup_view = {
        "sectors": norm.get("sectors"),
        "looking_for": norm.get("looking_for") or ["funding"],
        "stage": norm.get("stage"),
    }
    partners = await store.list_ready_partners()
    candidates = rule_filter(startup_view, partners)
    # Prefer high-confidence candidates; cap the handful sent to the LLM judge.
    candidates.sort(key=lambda c: (c["low_confidence_filter"], not c["purpose_match"]))
    candidates = candidates[: config.MATCH_MAX_CANDIDATES]

    await store.record_artifact(
        saga_id, "filter",
        {"candidates": candidates, "stats": {"partners": len(partners),
                                             "passed": len(candidates)}},
        entity_id=startup_id, target_id=startup_id, trace_id=trace_id,
    )
    next_jobs = ([{"stage": "match", "target_id": startup_id, "agent": "matcher"}]
                 if candidates else [])
    await store.complete_and_fanout(
        job_id=job["id"], saga_id=saga_id, event_kind="FilterCompleted",
        event_payload={"startup_id": startup_id, "candidates": len(candidates)},
        saga_step="match" if candidates else "filter",
        saga_status="running" if candidates else "done",
        next_jobs=next_jobs, trace_id=trace_id,
    )


# ---------- prompts (pi) ----------

def _startup_block(startup: dict) -> dict:
    prof = startup.get("profile") or {}
    norm = prof.get("normalized") or {}
    return {
        "name": startup.get("name"),
        "sectors": norm.get("sectors"),
        "stage": norm.get("stage"),
        "looking_for": norm.get("looking_for") or ["funding"],
        "description_en": norm.get("description_en"),
        "description_vi": norm.get("description_vi"),
    }


def _partner_block(partner: dict) -> dict:
    prof = partner.get("profile") or {}
    norm = prof.get("normalized") or {}
    seed = prof.get("seed") or {}
    return {
        "name": partner.get("name"),
        "type": partner.get("type"),
        "sectors": norm.get("sectors") or seed.get("innovation_areas")
                   or seed.get("research_domains") or seed.get("sectors"),
        "description_en": norm.get("description_en") or seed.get("note"),
        "country": seed.get("country"),
    }


def draft_prompt(startup: dict, partner: dict, match: dict, *,
                 verify_feedback: dict | None = None, retry: bool = False) -> str:
    partner_country = (partner.get("profile") or {}).get("seed", {}).get("country") or ""
    vn = "vietnam" in str(partner_country).lower()
    lead_lang = "Vietnamese" if vn else "English"
    fb = ""
    if verify_feedback:
        issues = verify_feedback.get("issues") or []
        fb = ("\n\nYOUR PREVIOUS DRAFT WAS REJECTED by the verifier. Fix these issues and "
              "regenerate BOTH languages:\n- " + "\n- ".join(str(i) for i in issues))
    reminder = ("\n\nIMPORTANT: reply with ONLY a single fenced ```json block."
                if retry else "")
    return f"""You are an outreach coordinator at Vietnam's National Innovation Center (NIC).

Write a personalized introduction email connecting this STARTUP with this PARTNER, in
BOTH Vietnamese and English. The partner is {partner_country or 'unknown'}-based, so the
primary language is {lead_lang} (still provide both).

STARTUP
{json.dumps(_startup_block(startup), ensure_ascii=False, indent=2)}

PARTNER
{json.dumps(_partner_block(partner), ensure_ascii=False, indent=2)}

WHY THIS MATCH (analyst rationale)
- EN: {match.get('rationale_en')}
- VI: {match.get('rationale_vi')}

REQUIREMENTS
- Tone: professional, warm, specific to this match. Under 150 words each.
- Explain why NIC is making the introduction and why the fit makes sense.
- Close with a clear next step. Use a NON-TIME call to action such as "NIC will
  coordinate a convenient time for a call" — do NOT propose or invent any specific
  date, time, or meeting slot (R15).
- Do NOT invent facts, metrics, funding figures, or past interactions beyond the data
  above. No personal (PII) details about individuals.{fb}

OUTPUT (R3 contract): reply with ONLY a single fenced ```json block:
{{"subject_en": "...", "subject_vi": "...", "draft_en": "...", "draft_vi": "..."}}
No prose before or after.{reminder}"""


def verify_prompt(startup: dict, partner: dict, match: dict, *, retry: bool = False) -> str:
    reminder = ("\n\nIMPORTANT: reply with ONLY a single fenced ```json block."
                if retry else "")
    return f"""You are a strict compliance reviewer at Vietnam's National Innovation Center
(NIC). Judge the outreach DRAFTS below (LLM-as-judge). Approve ONLY if every check passes.

SOURCE OF TRUTH (the only facts the draft may rely on)
STARTUP: {json.dumps(_startup_block(startup), ensure_ascii=False)}
PARTNER: {json.dumps(_partner_block(partner), ensure_ascii=False)}
RATIONALE_EN: {match.get('rationale_en')}

DRAFTS TO REVIEW
--- English ---
{match.get('draft_en')}
--- Vietnamese ---
{match.get('draft_vi')}

CHECKS (all must pass):
1. facts_grounded — every claim about the startup/partner traces to the source above;
   no invented metrics, funding amounts, customers, or history.
2. no_pii — no personal data about individuals (DOB, ID, personal phone/address).
3. language_ok — the English draft is in English and the Vietnamese draft is in natural
   Vietnamese; both convey the same intent.
4. no_invented_times — no specific meeting date/time/slot is proposed (a non-time CTA
   like "NIC will coordinate a time" is REQUIRED and acceptable) (R15).

OUTPUT (R3 contract): reply with ONLY a single fenced ```json block:
{{"pass": true, "checks": {{"facts_grounded": true, "no_pii": true,
  "language_ok": true, "no_invented_times": true}}, "issues": []}}
Set "pass" false and list concrete, actionable "issues" if ANY check fails. No prose.{reminder}"""
