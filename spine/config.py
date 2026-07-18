"""Runtime config from env (R14). Model is PINNED per spec §8/§11."""
import os

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgres://dealflow:dealflow@localhost:5432/dealflow"
)

# PINNED: only funded/allowed model for all agents (spec §8, §11).
AGENT_MODEL = os.environ.get("AGENT_MODEL", "deepseek/deepseek-v4-flash")

# Global concurrency cap across pools (spec §11 risk mitigation).
MAX_CONCURRENCY = int(os.environ.get("MAX_CONCURRENCY", "4"))

# Per-agent-turn wall clock. A deep feynman enrich (many web_search + fetch turns)
# can run a couple of minutes; bounded so a hung process is reclaimed.
AGENT_TIMEOUT = int(os.environ.get("AGENT_TIMEOUT", "240"))

# Lease must exceed pi's retry window (2+4+8s) AND the full agent turn (R6): otherwise
# a still-working agent's lease expires and a redundant duplicate is dispatched. Keep
# LEASE_SECONDS > AGENT_TIMEOUT.
LEASE_SECONDS = int(os.environ.get("LEASE_SECONDS", str(AGENT_TIMEOUT + 60)))

# Outreach saga (spec §6 Saga 2). Candidate handful sent to the LLM judge, and how many
# top matches get a drafted/verified email.
MATCH_MAX_CANDIDATES = int(os.environ.get("MATCH_MAX_CANDIDATES", "8"))
MATCH_TOP_K = int(os.environ.get("MATCH_TOP_K", "5"))

# Max attempts for a retryable sub-job before dead-letter (draft/verify retry loop, R5).
MAX_ATTEMPTS = int(os.environ.get("MAX_ATTEMPTS", "3"))
