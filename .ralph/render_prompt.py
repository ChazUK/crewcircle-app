#!/usr/bin/env python3
"""Render a Ralph prompt template by substituting {{VAR}} placeholders from the environment.

Missing variables resolve to empty string — used for the optional PRD / comments sections.
"""
import os
import re
import sys
from pathlib import Path

PLACEHOLDER = re.compile(r"\{\{([A-Z_][A-Z0-9_]*)\}\}")


def render(template: str, env: dict) -> str:
    return PLACEHOLDER.sub(lambda m: env.get(m.group(1), ""), template)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: render_prompt.py <template-path>", file=sys.stderr)
        sys.exit(1)
    template = Path(sys.argv[1]).read_text()
    sys.stdout.write(render(template, os.environ))
