#!/usr/bin/env python3
"""Copy the current Claude Code session transcript into the repo.

Wired as a Stop + SessionEnd hook (see .claude/settings.json). Claude Code
passes the hook a JSON object on stdin containing `transcript_path` and
`session_id`. We copy the live JSONL transcript to session-logs/<id>.jsonl so
every session is captured in-repo. Failures are swallowed so a logging issue
never blocks the session.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from redact import redact
except Exception:
    def redact(text):
        return text


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except Exception:
        return 0

    src = event.get("transcript_path")
    session_id = event.get("session_id", "unknown")
    if not src or not os.path.isfile(src):
        return 0

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or event.get("cwd") or os.getcwd()
    dest_dir = os.path.join(project_dir, "session-logs")
    os.makedirs(dest_dir, exist_ok=True)

    try:
        with open(src, encoding="utf-8") as f:
            data = f.read()
        with open(os.path.join(dest_dir, f"{session_id}.jsonl"), "w", encoding="utf-8") as f:
            f.write(redact(data))
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
