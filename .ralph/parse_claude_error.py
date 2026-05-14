#!/usr/bin/env python3
"""Extract the most useful error detail from a Claude stream-json log."""
import json
import sys


def extract_error(log_path: str) -> str:
    try:
        with open(log_path) as f:
            lines = f.readlines()
    except OSError:
        return ""

    for line in reversed(lines):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except (json.JSONDecodeError, ValueError):
            continue

        if obj.get("type") == "result" and obj.get("is_error"):
            return (obj.get("result") or "").strip()

        if obj.get("type") == "assistant":
            for block in obj.get("message", {}).get("content", []):
                if block.get("type") != "text":
                    continue
                txt = (block.get("text") or "").strip()
                if "error" in txt.lower() or "blocked" in txt.lower():
                    return txt[:500]

    return ""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(0)
    out = extract_error(sys.argv[1])
    if out:
        print(out)
