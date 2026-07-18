"""RPC transport for pi/feynman agent runtimes (spec §4, R3, R7).

Protocol (verified on this host):
  →  {"id": N, "type": "prompt", "message": "<task text>"}
  ←  {"id": N, "type": "response", "command": "prompt", "success": true}   # ACK ONLY
  ←  {"type":"agent_start"} {"type":"turn_start"} {"type":"message_*"} ...
  ←  {"type":"turn_end", "message": {role, content:[{text}], usage:{...cost{}}, stopReason}}
  ←  {"type":"agent_end", "willRetry": <bool>}
  ←  ({"type":"auto_retry_*"})?  {"type":"agent_settled"}                  # pi TERMINAL

Rules enforced here:
  - request content field is `message` (not text/prompt/content)
  - {id, success:true} is an ACK, NOT completion
  - completion = agent_settled (pi) OR agent_end w/ willRetry=false + settle grace
    (feynman does NOT emit agent_settled — verified: agent_end is its last event)
  - assistant text lives in turn_end.message.content[] text blocks
  - usage.cost is a nested object ({input,output,...}) — summed to a scalar
  - ignore extension_ui_request / setWidget lines (feynman emits them)
  - stdin is held OPEN for the life of the worker
  - session reset = {"type":"new_session"} (R7)
  - errors surface as turn_end.message.stopReason=="error" + errorMessage
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import signal
from dataclasses import dataclass, field
from typing import Any, Callable, Protocol

from . import config

# feynman streams whole enriched-profile JSON on one line; asyncio's default 64KB
# readline limit raises "chunk is longer than limit". Give generous headroom.
_STREAM_LIMIT = 2 ** 23  # 8 MiB
_IGNORED_EVENTS = {"extension_ui_request", "setWidget"}
_JSON_FENCE = re.compile(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", re.DOTALL)

# pi resolves the deepseek provider key from $DEEPSEEK_API_KEY (models.json). R14 says the
# spine uses host ~/.pi & ~/.feynman auth, so we lift the key out of host auth and inject it
# into the child env when the operator has not already exported it. Cached after first read.
_DEEPSEEK_KEY_CACHE: list = []


def _host_deepseek_key() -> str | None:
    if _DEEPSEEK_KEY_CACHE:
        return _DEEPSEEK_KEY_CACHE[0]
    key = None
    for auth in (os.path.expanduser("~/.pi/agent/auth.json"),
                 os.path.expanduser("~/.feynman/agent/auth.json")):
        try:
            with open(auth) as f:
                data = json.load(f)
            entry = data.get("deepseek")
            if isinstance(entry, dict) and entry.get("key"):
                key = entry["key"]
                break
        except (OSError, ValueError):
            continue
    _DEEPSEEK_KEY_CACHE.append(key)
    return key


@dataclass(slots=True)
class AgentSpec:
    """Declarative agent registry entry (spec §4)."""
    name: str
    runtime: str                      # pi | feynman
    skill: str                        # path to SKILL.md dir
    stage: str = ""                   # saga stage this agent serves (enrich | extract | ...)
    tools: list[str] = field(default_factory=list)
    lifecycle: str = "pool"
    pool_size: int = 1
    model: str = config.AGENT_MODEL   # PINNED


@dataclass(slots=True)
class TurnUsage:
    tokens_in: int | None = None
    tokens_out: int | None = None
    cache_read: int | None = None
    cache_write: int | None = None
    cost_usd: float | None = None


@dataclass(slots=True)
class RpcResult:
    """Result of one prompt round-trip, collected up to agent_settled."""
    id: int
    text: str                          # concatenated assistant text
    data: Any | None                   # parsed JSON from the terminal fenced block (R3), or None
    usages: list[TurnUsage] = field(default_factory=list)
    stop_reason: str | None = None
    error_message: str | None = None

    @property
    def success(self) -> bool:
        return self.stop_reason != "error"


def extract_json_block(text: str) -> Any | None:
    """R3: the agent's terminal message is a single fenced ```json block."""
    if not text:
        return None
    matches = _JSON_FENCE.findall(text)
    candidate = matches[-1] if matches else text.strip()
    try:
        return json.loads(candidate)
    except (json.JSONDecodeError, TypeError):
        return None


def _scalar_cost(cost: Any) -> float | None:
    """usage.cost is a nested object ({input, output, cacheRead,...}) on this host;
    sum the numeric leaves. Tolerates a plain number too."""
    if isinstance(cost, (int, float)):
        return float(cost)
    if isinstance(cost, dict):
        total = 0.0
        found = False
        for v in cost.values():
            if isinstance(v, (int, float)):
                total += v
                found = True
        return total if found else None
    return None


class ProcessDied(RuntimeError):
    pass


class RpcChannel:
    """One agent process. Duck-typed on stdin (write/drain) + stdout (readline)
    so a fake process drives the unit tests without a real runtime."""

    def __init__(self, stdin, stdout, *, proc=None,
                 on_usage: Callable[[TurnUsage], None] | None = None,
                 settle_grace: float = 4.0):
        self._stdin = stdin
        self._stdout = stdout
        self._proc = proc
        self._on_usage = on_usage
        # Grace window after agent_end(willRetry=false) to see agent_settled or
        # auto_retry_start (pi). If nothing arrives, agent_end WAS terminal (feynman).
        self._settle_grace = settle_grace
        self._id = 0
        self._lock = asyncio.Lock()

    async def _write(self, obj: dict) -> None:
        line = (json.dumps(obj) + "\n").encode()
        self._stdin.write(line)
        await self._stdin.drain()

    async def prompt(self, message: str, *, timeout: float = 300.0) -> RpcResult:
        """Send a prompt and collect events by id until agent_settled."""
        async with self._lock:            # one in-flight prompt per channel
            self._id += 1
            req_id = self._id
            await self._write({"id": req_id, "type": "prompt", "message": message})
            return await self._collect(req_id, timeout)

    async def new_session(self) -> None:
        """R7: per-job session reset for pooled workers."""
        async with self._lock:
            await self._write({"type": "new_session"})

    async def _stderr_tail(self, limit: int = 1200) -> str:
        """Best-effort stderr tail to explain a crash in the ProcessDied message."""
        proc = self._proc
        if proc is None or proc.stderr is None:
            return ""
        try:
            data = await asyncio.wait_for(proc.stderr.read(limit), 2.0)
        except (asyncio.TimeoutError, Exception):
            return ""
        text = data.decode(errors="replace").strip() if data else ""
        return f" | stderr: {text}" if text else ""

    async def _collect(self, req_id: int, timeout: float) -> RpcResult:
        texts: list[str] = []
        usages: list[TurnUsage] = []
        stop_reason: str | None = None
        error_message: str | None = None
        soft_terminal = False   # saw agent_end(willRetry=false); agent_settled may follow

        while True:
            read_to = self._settle_grace if soft_terminal else timeout
            try:
                raw = await asyncio.wait_for(self._stdout.readline(), read_to)
            except asyncio.TimeoutError:
                if soft_terminal:
                    break                            # feynman: agent_end was terminal
                raise
            if not raw:
                if soft_terminal:
                    break                            # process exited after finishing
                raise ProcessDied(
                    "agent stdout closed before terminal event"
                    + await self._stderr_tail())
            line = raw.decode().strip() if isinstance(raw, (bytes, bytearray)) else raw.strip()
            if not line:
                continue
            try:
                evt = json.loads(line)
            except json.JSONDecodeError:
                continue

            etype = evt.get("type")
            if etype in _IGNORED_EVENTS:            # ignore feynman UI events
                continue
            if etype == "response":                 # {id, success} ACK — not completion
                # A startup/auth error (e.g. missing API key) rides in on the ACK with
                # success=false and no further events; surface it instead of hanging.
                if evt.get("id") == req_id and evt.get("success") is False:
                    stop_reason = "error"
                    error_message = evt.get("error")
                    break
                continue
            if etype == "turn_end":
                msg = evt.get("message") or {}
                if msg.get("role") == "assistant":
                    for block in msg.get("content") or []:
                        if isinstance(block, dict) and block.get("text"):
                            texts.append(block["text"])
                    if msg.get("stopReason") == "error":
                        stop_reason = "error"
                        error_message = msg.get("errorMessage")
                usage = msg.get("usage")
                if usage:
                    tu = TurnUsage(
                        tokens_in=usage.get("input"),
                        tokens_out=usage.get("output"),
                        cache_read=usage.get("cache_read") or usage.get("cacheRead"),
                        cache_write=usage.get("cache_write") or usage.get("cacheWrite"),
                        cost_usd=_scalar_cost(usage.get("cost")),
                    )
                    usages.append(tu)
                    if self._on_usage:
                        self._on_usage(tu)
            elif etype == "auto_retry_start":       # pi retry in progress — keep waiting
                soft_terminal = False
            elif etype == "agent_end":
                # willRetry=true → pi will auto_retry; keep the full timeout.
                # willRetry=false → terminal for feynman (no agent_settled); pi still
                # emits agent_settled which we catch within the grace window.
                soft_terminal = not evt.get("willRetry", False)
            elif etype == "agent_settled":          # pi TERMINAL
                break

        full = "\n".join(texts)
        return RpcResult(
            id=req_id, text=full, data=extract_json_block(full),
            usages=usages, stop_reason=stop_reason, error_message=error_message,
        )

    async def close(self) -> None:
        try:
            self._stdin.close()
        except Exception:
            pass
        proc = self._proc
        if proc is None:
            return
        # feynman is a shim that spawns a node child; terminate() on the shim orphans
        # the child (and it keeps spending). Kill the whole process group (spawned with
        # start_new_session=True, so pgid == proc.pid).
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            try:
                proc.kill()
            except ProcessLookupError:
                pass
        try:
            await asyncio.wait_for(proc.wait(), 5)
        except (asyncio.TimeoutError, Exception):
            pass


class RuntimeLauncher(Protocol):
    async def spawn(self, spec: AgentSpec, worker_id: str) -> RpcChannel: ...


class LocalProcessLauncher:
    """Host subprocess launcher (spec §4 Launcher seam). Uses host ~/.pi & ~/.feynman auth.
    ContainerLauncher (same RpcChannel) is a WIP seam (§12).

    The two runtimes have different CLIs (verified on this host):
      - pi:      `pi --model M --mode rpc --session-id W --skill P --tools ...`
      - feynman: `feynman chat --mode rpc --model M --cwd <repo>` — rejects
                 --session-id/--skill/--tools; discovers .feynman/agent/skills via cwd
                 and ships web tools by default (why it's the crawler runtime, D4).
    """

    def __init__(self, cwd: str | None = None):
        # feynman discovers .feynman/agent/skills relative to this dir.
        self.cwd = cwd or os.getcwd()

    def build_command(self, spec: AgentSpec, worker_id: str) -> list[str]:
        if spec.runtime == "feynman":
            return [
                "feynman", "chat",
                "--mode", "rpc",
                "--model", spec.model,
                "--cwd", self.cwd,
            ]
        # pi validates --session-id: only [A-Za-z0-9._-], must start/end alphanumeric.
        # worker_id carries ':' (name:epoch:job) which pi rejects, so sanitize it here
        # (the DB registry still keys on the original worker_id).
        session_id = re.sub(r"[^A-Za-z0-9._-]", "-", worker_id).strip("-_.") or "w"
        cmd = [
            spec.runtime,
            "--model", spec.model,
            "--mode", "rpc",
            "--session-id", session_id,
        ]
        if spec.skill:
            cmd += ["--skill", spec.skill]
        if spec.tools:
            cmd += ["--tools", ",".join(spec.tools)]
        return cmd

    async def spawn(self, spec: AgentSpec, worker_id: str,
                    on_usage: Callable[[TurnUsage], None] | None = None) -> RpcChannel:
        cmd = self.build_command(spec, worker_id)
        env = os.environ.copy()
        if "DEEPSEEK_API_KEY" not in env:
            key = _host_deepseek_key()
            if key:
                env["DEEPSEEK_API_KEY"] = key
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=self.cwd,
            env=env,
            limit=_STREAM_LIMIT,        # allow >64KB JSON lines
            start_new_session=True,     # own process group → clean group kill on close
        )
        return RpcChannel(proc.stdin, proc.stdout, proc=proc, on_usage=on_usage)
