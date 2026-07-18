#!/usr/bin/env python3
"""Redact secrets from Claude Code session transcripts.

Used by save-session-log.py (going forward) and cleanup passes (existing logs).
Each match is replaced by [REDACTED:<type>] so JSON/Markdown stays well-formed.
Run standalone to redact files in place:  python3 redact.py <file>...
"""
import re
import sys

# (compiled pattern, replacement). Value-only patterns redact the whole match;
# assignment patterns keep the key name via a backref and redact only the value.
_RULES = [
    # High-confidence provider keys (value = whole match)
    (re.compile(r"sk-ant-[A-Za-z0-9_-]{20,}"), "[REDACTED:anthropic-key]"),
    (re.compile(r"sk-proj-[A-Za-z0-9_-]{20,}"), "[REDACTED:openai-key]"),
    (re.compile(r"sk-[A-Za-z0-9]{20,}"), "[REDACTED:openai-key]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "[REDACTED:aws-access-key]"),
    (re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"), "[REDACTED:github-token]"),
    (re.compile(r"xox[baprs]-[A-Za-z0-9-]{10,}"), "[REDACTED:slack-token]"),
    (re.compile(r"AIza[0-9A-Za-z_-]{35}"), "[REDACTED:google-key]"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}"), "[REDACTED:jwt]"),
    # Telegram bot token: <bot_id>:<35-char auth> (bare, not in key=value form)
    (re.compile(r"\b[0-9]{8,10}:[A-Za-z0-9_-]{35}\b"), "[REDACTED:telegram-token]"),
    # ngrok authtoken (long base-ish token)
    (re.compile(r"\b[0-9A-Za-z]{20,}_[0-9A-Za-z]{20,}\b"), "[REDACTED:token]"),
    # Password inside a connection URI:  scheme://user:PASSWORD@host
    (re.compile(r"(://[^:/@\s]+:)[^@/\s]{4,}(@)"), r"\1[REDACTED:db-password]\2"),
    # Generic assignments: KEY=value / "key": "value" / key: value  (keep key, redact value)
    (re.compile(
        r'((?:api[_-]?key|secret[_-]?key|secret|access[_-]?token|auth[_-]?token|'
        r'authtoken|token|password|passwd|pwd|bearer|authorization|client[_-]?secret)'
        r'["\']?\s*[:=]\s*["\']?)'
        r'([A-Za-z0-9/+._-]{6,})',
        re.IGNORECASE), r"\1[REDACTED]"),
]

# Don't redact values that are obviously non-secret placeholders.
_ALLOW = re.compile(r"^(your[_-]?|xxx|placeholder|example|changeme|change_this|<)", re.IGNORECASE)


def redact(text: str) -> str:
    for pat, repl in _RULES:
        if callable(repl):
            text = pat.sub(repl, text)
        elif "\\1" in repl or "\\2" in repl:
            def _sub(m, _repl=repl):
                val = m.group(2) if m.re.groups >= 2 else ""
                if val and _ALLOW.match(val):
                    return m.group(0)
                return m.expand(_repl)
            text = pat.sub(_sub, text)
        else:
            text = pat.sub(repl, text)
    return text


def _redact_file(path: str) -> int:
    with open(path, encoding="utf-8") as f:
        orig = f.read()
    new = redact(orig)
    if new != orig:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new)
    return sum(1 for _ in re.finditer(r"\[REDACTED", new))


if __name__ == "__main__":
    total = 0
    for p in sys.argv[1:]:
        try:
            n = _redact_file(p)
            total += n
            print(f"{n:5d} redactions  {p}")
        except Exception as ex:
            print(f"  skip {p}: {ex}")
    print(f"\nTotal redaction markers: {total}")
