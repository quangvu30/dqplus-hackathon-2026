"""AgentSpec registry loader (agents/specs.yaml, R4).

Reads the declarative registry into AgentSpec objects and exposes a stage→spec
map the supervisor uses to route a leased job to the right runtime.
"""
from __future__ import annotations

import yaml

from . import config
from .transport import AgentSpec

DEFAULT_PATH = "agents/specs.yaml"


def load_specs(path: str = DEFAULT_PATH) -> dict[str, AgentSpec]:
    with open(path) as f:
        doc = yaml.safe_load(f)
    default_model = doc.get("model", config.AGENT_MODEL)
    specs: dict[str, AgentSpec] = {}
    for name, a in (doc.get("agents") or {}).items():
        specs[name] = AgentSpec(
            name=name,
            runtime=a["runtime"],
            skill=a.get("skill", ""),
            stage=a["stage"],
            tools=a.get("tools", []),
            pool_size=int(a.get("pool_size", 1)),
            model=a.get("model", default_model),
        )
    return specs


def specs_by_stage(specs: dict[str, AgentSpec]) -> dict[str, AgentSpec]:
    return {s.stage: s for s in specs.values()}
