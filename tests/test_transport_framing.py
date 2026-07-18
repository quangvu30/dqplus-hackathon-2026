"""RPC framing unit tests with a FAKE process (no real runtime).

Covers spec §4 / R3 transport rules:
  - collect-by-id: request framing + assistant text/JSON captured
  - terminal = agent_settled (ACK line is NOT completion)
  - ignore extension_ui_request / setWidget lines
  - usage.cost captured
  - error stopReason surfaced
  - new_session reset framing (R7)
"""
import asyncio
import json

import pytest

from spine.transport import RpcChannel, extract_json_block


class FakeStdin:
    def __init__(self):
        self.written = []

    def write(self, b):
        self.written.append(b)

    async def drain(self):
        pass

    def close(self):
        pass

    def lines(self):
        return [json.loads(b.decode()) for b in self.written]


def make_stdout(events: list[dict]) -> asyncio.StreamReader:
    reader = asyncio.StreamReader()
    for evt in events:
        reader.feed_data((json.dumps(evt) + "\n").encode())
    reader.feed_eof()
    return reader


def turn_end(text, *, usage=None, stop_reason=None, error=None):
    msg = {"role": "assistant", "content": [{"text": text}]}
    if usage:
        msg["usage"] = usage
    if stop_reason:
        msg["stopReason"] = stop_reason
    if error:
        msg["errorMessage"] = error
    return {"type": "turn_end", "message": msg}


async def test_collect_by_id_and_json_extraction():
    events = [
        {"id": 1, "type": "response", "command": "prompt", "success": True},  # ACK only
        {"type": "agent_start"},
        {"type": "turn_start"},
        turn_end('Here you go:\n```json\n{"score": 87, "ok": true}\n```',
                 usage={"input": 120, "output": 40, "cost": 0.0012}),
        {"type": "agent_end", "messages": [], "willRetry": False},
        {"type": "agent_settled"},
    ]
    stdin = FakeStdin()
    ch = RpcChannel(stdin, make_stdout(events))

    res = await ch.prompt("rank these", timeout=5)

    # request framing: content field is `message`, discriminator is `type`
    req = stdin.lines()[0]
    assert req == {"id": 1, "type": "prompt", "message": "rank these"}
    # collect-by-id: result carries the request id
    assert res.id == 1
    # parsed JSON from terminal fenced block (R3)
    assert res.data == {"score": 87, "ok": True}
    # usage.cost captured
    assert res.usages[0].cost_usd == 0.0012
    assert res.usages[0].tokens_in == 120
    assert res.success is True


async def test_ack_line_is_not_completion_terminal_is_agent_settled():
    # If the ACK were treated as completion we'd never see the answer.
    events = [
        {"id": 1, "type": "response", "command": "prompt", "success": True},
        turn_end('```json\n{"answer": 42}\n```'),
        {"type": "agent_settled"},
    ]
    ch = RpcChannel(FakeStdin(), make_stdout(events))
    res = await ch.prompt("q", timeout=5)
    assert res.data == {"answer": 42}


async def test_ignores_ui_events():
    events = [
        {"id": 1, "type": "response", "success": True},
        {"type": "extension_ui_request", "payload": {"x": 1}},
        {"type": "setWidget", "widget": "foo"},
        turn_end("plain answer"),
        {"type": "extension_ui_request", "payload": {"y": 2}},
        {"type": "agent_settled"},
    ]
    ch = RpcChannel(FakeStdin(), make_stdout(events))
    res = await ch.prompt("q", timeout=5)
    assert res.text == "plain answer"
    assert res.success is True


async def test_error_stop_reason_surfaced():
    events = [
        {"id": 1, "type": "response", "success": True},
        turn_end("", stop_reason="error", error="429 Insufficient balance"),
        {"type": "agent_settled"},
    ]
    ch = RpcChannel(FakeStdin(), make_stdout(events))
    res = await ch.prompt("q", timeout=5)
    assert res.success is False
    assert res.stop_reason == "error"
    assert res.error_message == "429 Insufficient balance"


async def test_process_death_before_settled_raises():
    from spine.transport import ProcessDied
    events = [
        {"id": 1, "type": "response", "success": True},
        turn_end("partial"),
        # no agent_settled — stdout closes (eof)
    ]
    ch = RpcChannel(FakeStdin(), make_stdout(events))
    with pytest.raises(ProcessDied):
        await ch.prompt("q", timeout=5)


async def test_new_session_framing():
    ch = RpcChannel(FakeStdin(), make_stdout([]))
    await ch.new_session()
    assert ch._stdin.lines()[0] == {"type": "new_session"}


def test_extract_json_block_variants():
    assert extract_json_block('```json\n{"a":1}\n```') == {"a": 1}
    assert extract_json_block('text ```\n[1,2,3]\n``` trailing') == [1, 2, 3]
    assert extract_json_block('{"bare": true}') == {"bare": True}
    assert extract_json_block("no json here") is None
